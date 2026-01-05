"""
Lead import service for CSV processing and bulk operations
"""
import asyncio
import uuid
import csv
import io
import phonenumbers
import re
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass
from fastapi import UploadFile, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func
import logging

from app.models.lead import Lead
from app.models.lead_phone import LeadPhone
from app.schemas.lead import LeadImportResult

logger = logging.getLogger(__name__)

# Error types for detailed error reporting
class ImportErrorType:
    INVALID_PHONE = "invalid_phone"
    MISSING_REQUIRED = "missing_required"
    DUPLICATE_LEAD = "duplicate_lead"
    INVALID_EMAIL = "invalid_email"
    INVALID_DATA_TYPE = "invalid_data_type"
    VALIDATION_ERROR = "validation_error"

# Import status tracking
@dataclass
class ImportProgress:
    import_id: str
    status: str  # processing, completed, failed
    progress_pct: float
    current_row: int
    total_rows: int
    eta_seconds: Optional[int]
    started_at: datetime
    updated_at: datetime
    error_count: int = 0
    success_count: int = 0
    duplicate_skips: int = 0
    current_batch: int = 0
    total_batches: int = 0

# Class-level cache for import status
_import_status_cache: Dict[str, ImportProgress] = {}


class LeadImportService:
    """Service for handling CSV lead imports"""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.batch_size = 100

    async def execute_import(
        self,
        file: UploadFile,
        column_mappings: Dict[str, str],
        skip_duplicates: bool,
        update_existing: bool,
        organization_id: str,
        user_id: str,
        bulk_tags: List[str] = None,
        auto_tagging_enabled: bool = False,
        tagging_options: Dict = None
    ) -> LeadImportResult:
        """Execute the CSV import process with enhanced features"""

        if bulk_tags is None:
            bulk_tags = []
        if tagging_options is None:
            tagging_options = {}

        import_id = str(uuid.uuid4())
        import_batch_id = self._generate_import_batch_id()
        start_time = datetime.utcnow()

        # Initialize result with enhanced fields
        result = LeadImportResult(
            import_id=import_id,
            status="processing",
            total_rows=0,
            processed_rows=0,
            successful_imports=0,
            failed_imports=0,
            duplicate_skips=0,
            errors=[],
            created_at=start_time,
            progress_percentage=0.0,
            estimated_time_remaining=None,
            current_batch=0,
            total_batches=0,
            import_batch_id=import_batch_id,
            validation_warnings=[]
        )

        # Initialize progress tracking
        progress = ImportProgress(
            import_id=import_id,
            status="processing",
            progress_pct=0.0,
            current_row=0,
            total_rows=0,
            eta_seconds=None,
            started_at=start_time,
            updated_at=start_time,
            duplicate_skips=0,
            current_batch=0,
            total_batches=0
        )
        _import_status_cache[import_id] = progress

        try:
            # Read and parse CSV
            contents = await file.read()
            csv_content = contents.decode('utf-8')
            csv_reader = csv.DictReader(io.StringIO(csv_content))

            rows = list(csv_reader)
            result.total_rows = len(rows)
            progress.total_rows = len(rows)
            progress.total_batches = (len(rows) + self.batch_size - 1) // self.batch_size
            result.total_batches = (len(rows) + self.batch_size - 1) // self.batch_size

            logger.info(f"Starting import {import_id} with {len(rows)} rows, batch_size={self.batch_size}")

            # Validate CSV structure before processing
            validation_warnings = await self._validate_csv_structure(rows, column_mappings)
            result.validation_warnings.extend(validation_warnings)

            # Process rows in batches with enhanced tracking
            for i in range(0, len(rows), self.batch_size):
                batch_num = i // self.batch_size + 1
                batch = rows[i:i + self.batch_size]

                # Update progress
                progress.current_row = i + len(batch)
                progress.current_batch = batch_num
                result.current_batch = batch_num
                result.processed_rows = i + len(batch)

                # Process batch with enhanced error handling
                batch_result = await self._process_batch(
                    batch,
                    column_mappings,
                    skip_duplicates,
                    update_existing,
                    organization_id,
                    user_id,
                    import_batch_id,
                    bulk_tags,
                    auto_tagging_enabled,
                    tagging_options,
                    i  # row offset
                )

                # Update results
                result.successful_imports += batch_result['success_count']
                result.failed_imports += batch_result['failed_count']
                result.duplicate_skips += batch_result['duplicate_count']
                result.errors.extend(batch_result['errors'])

                # Update progress tracking - accumulate counts instead of resetting
                progress.success_count += batch_result['success_count']
                progress.error_count += batch_result['failed_count']
                progress.duplicate_skips += batch_result['duplicate_count']
                progress.progress_pct = (progress.current_row / progress.total_rows) * 100
                result.progress_percentage = progress.progress_pct

                # Calculate ETA
                elapsed_seconds = (datetime.utcnow() - start_time).total_seconds()
                if progress.current_row > 0:
                    rows_per_second = progress.current_row / elapsed_seconds
                    remaining_rows = progress.total_rows - progress.current_row
                    progress.eta_seconds = int(remaining_rows / rows_per_second) if rows_per_second > 0 else None
                    result.estimated_time_remaining = progress.eta_seconds

                progress.updated_at = datetime.utcnow()

                # Commit batch
                await self.db.commit()

                logger.info(f"Processed batch {batch_num}/{result.total_batches}, "
                          f"progress: {progress.progress_pct:.1f}%, "
                          f"success: {batch_result['success_count']}, "
                          f"failed: {batch_result['failed_count']}, "
                          f"duplicates: {batch_result['duplicate_count']}")

            # Final status update
            result.status = "completed"
            result.completed_at = datetime.utcnow()
            progress.status = "completed"
            progress.progress_pct = 100.0
            result.progress_percentage = 100.0
            progress.eta_seconds = 0
            result.estimated_time_remaining = 0
            progress.updated_at = datetime.utcnow()

            logger.info(f"Import {import_id} completed successfully - "
                       f"Total: {result.total_rows}, "
                       f"Success: {result.successful_imports}, "
                       f"Failed: {result.failed_imports}, "
                       f"Duplicates: {result.duplicate_skips}")

        except Exception as e:
            result.status = "failed"
            progress.status = "failed"
            result.errors.append({
                'row_number': 'N/A',
                'error_type': ImportErrorType.VALIDATION_ERROR,
                'field_name': None,
                'message': f"Import failed: {str(e)}",
                'suggested_fix': 'Check file format and try again'
            })
            logger.error(f"Import {import_id} failed: {str(e)}", exc_info=True)

        # Store final progress
        _import_status_cache[import_id] = progress

        # Cleanup old imports (keep for 1 hour)
        self._cleanup_old_imports()

        return result
    
    async def _process_batch(
        self,
        rows: List[Dict[str, str]],
        column_mappings: Dict[str, str],
        skip_duplicates: bool,
        update_existing: bool,
        organization_id: str,
        user_id: str,
        import_batch_id: str,
        bulk_tags: List[str],
        auto_tagging_enabled: bool,
        tagging_options: Dict,
        row_offset: int
    ) -> Dict[str, int]:
        """Process a batch of CSV rows with enhanced features"""

        success_count = 0
        failed_count = 0
        duplicate_count = 0
        errors = []

        # Start transaction for batch
        try:
            # Pre-validate batch and collect phone numbers for bulk duplicate check
            batch_phones = []
            batch_emails = []
            validated_rows = []

            for idx, row in enumerate(rows):
                row_number = row_offset + idx + 1
                try:
                    # Map CSV columns to lead fields with enhanced validation
                    lead_data = self._map_row_to_lead(row, column_mappings, row_number)

                    # Add bulk tags and auto-tagging
                    lead_data = self._apply_bulk_and_auto_tags(
                        lead_data, bulk_tags, auto_tagging_enabled, tagging_options
                    )

                    # Validate required fields with detailed errors
                    validation_error = self._validate_required_fields(lead_data, row_number)
                    if validation_error:
                        errors.append(validation_error)
                        failed_count += 1
                        continue

                    # Collect phones and emails for bulk duplicate check
                    phones = self._deduplicate_phones(
                        lead_data.get('phone1'),
                        lead_data.get('phone2'),
                        lead_data.get('phone3')
                    )
                    batch_phones.extend(phones)

                    if lead_data.get('email'):
                        batch_emails.append(lead_data['email'])

                    validated_rows.append((row_number, lead_data))

                except Exception as e:
                    errors.append({
                        'row_number': row_number,
                        'error_type': ImportErrorType.VALIDATION_ERROR,
                        'field_name': None,
                        'message': f"Row validation failed: {str(e)}",
                        'suggested_fix': 'Check data format in this row'
                    })
                    failed_count += 1
                    logger.warning(f"Failed to validate row {row_number}: {str(e)}")

            # Bulk duplicate check for efficiency
            duplicate_map = await self._check_duplicates_batch(
                batch_phones, batch_emails, organization_id
            )

            # Process validated rows
            for row_number, lead_data in validated_rows:
                try:
                    # Check for duplicates using bulk results
                    duplicate_info = await self._find_duplicate_lead_enhanced(
                        lead_data, organization_id, duplicate_map
                    )

                    if duplicate_info:
                        if skip_duplicates:
                            duplicate_count += 1
                            logger.debug(f"Skipping duplicate lead at row {row_number}")
                            continue
                        elif update_existing:
                            # Update existing lead
                            await self._update_existing_lead_enhanced(
                                duplicate_info['lead'], lead_data, import_batch_id, row_number
                            )
                            success_count += 1
                            logger.debug(f"Updated existing lead at row {row_number}")
                            continue

                    # Create new lead with enhanced tracking
                    await self._create_new_lead_enhanced(
                        lead_data, organization_id, user_id, import_batch_id, row_number
                    )
                    success_count += 1
                    logger.debug(f"Created new lead at row {row_number}")

                except Exception as e:
                    errors.append({
                        'row_number': row_number,
                        'error_type': ImportErrorType.VALIDATION_ERROR,
                        'field_name': None,
                        'message': f"Failed to process row: {str(e)}",
                        'suggested_fix': 'Check data integrity and try again'
                    })
                    failed_count += 1
                    logger.warning(f"Failed to process row {row_number}: {str(e)}")

        except Exception as e:
            # Rollback on batch failure
            await self.db.rollback()
            logger.error(f"Batch processing failed, rolling back: {str(e)}")
            raise

        return {
            'success_count': success_count,
            'failed_count': failed_count,
            'duplicate_count': duplicate_count,
            'errors': errors
        }
    
    def _map_row_to_lead(self, row: Dict[str, str], column_mappings: Dict[str, str], row_number: int = None) -> Dict[str, Any]:
        """Map CSV row data to lead fields using column mappings with enhanced validation"""

        lead_data = {}
        name_parts = {"first_name": None, "last_name": None}

        # Map each CSV column to lead field
        for csv_column, lead_field in column_mappings.items():
            if csv_column in row and row[csv_column] and row[csv_column].strip():
                value = row[csv_column].strip()

                try:
                    # Special handling for different field types
                    if lead_field.startswith('phone'):
                        # Normalize phone number with enhanced validation
                        normalized_phone = self._normalize_phone_enhanced(value)
                        if normalized_phone:
                            lead_data[lead_field] = normalized_phone
                        elif value:  # Value provided but invalid
                            raise ValueError(f"Invalid phone number format: {value}")
                    elif lead_field == 'email':
                        # Validate email format
                        if self._validate_email_format(value):
                            lead_data[lead_field] = value.lower().strip()
                        elif value:
                            raise ValueError(f"Invalid email format: {value}")
                    elif lead_field == 'acreage':
                        # Convert to float
                        try:
                            lead_data[lead_field] = float(value)
                        except ValueError:
                            if value:  # Only raise if value provided
                                raise ValueError(f"Invalid acreage format: {value}")
                    elif lead_field == 'estimated_value':
                        # Convert to int
                        try:
                            # Remove currency symbols and commas
                            clean_value = value.replace('$', '').replace(',', '').replace(' ', '')
                            lead_data[lead_field] = int(float(clean_value))
                        except ValueError:
                            if value:
                                raise ValueError(f"Invalid estimated value format: {value}")
                    elif lead_field in ['tags']:
                        # Handle array fields
                        if ',' in value:
                            lead_data[lead_field] = [tag.strip() for tag in value.split(',') if tag.strip()]
                        else:
                            lead_data[lead_field] = [value]
                    else:
                        # Standard string field - normalize whitespace
                        lead_data[lead_field] = value.strip()

                except ValueError as e:
                    raise ValueError(f"Field '{lead_field}': {str(e)}")

                if lead_field in name_parts:
                    name_parts[lead_field] = lead_data.get(lead_field)

        # Set computed fields
        if lead_data.get('first_name') or lead_data.get('last_name'):
            first = lead_data.get('first_name') or ''
            last = lead_data.get('last_name') or ''
            lead_data['owner_name'] = f"{first} {last}".strip()

        return lead_data
    
    def _normalize_phone_enhanced(self, phone_str: str) -> Optional[str]:
        """Normalize phone number to E.164 format with enhanced error handling"""
        try:
            # Remove common formatting characters
            clean_phone = re.sub(r'[^\d+]', '', phone_str)

            # Try to parse with multiple country codes
            for country_code in ['US', 'CA', 'GB', 'AU', 'DE']:
                try:
                    parsed = phonenumbers.parse(clean_phone, country_code)
                    if phonenumbers.is_valid_number(parsed):
                        return phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)
                except:
                    continue

        except Exception as e:
            logger.debug(f"Phone normalization failed for '{phone_str}': {str(e)}")
        return None

    def _validate_email_format(self, email_str: str) -> bool:
        """Validate email format with comprehensive regex"""
        email_regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return bool(re.match(email_regex, email_str.strip()))

    def _validate_required_fields(self, lead_data: Dict[str, Any], row_number: int) -> Optional[Dict]:
        """Validate required fields and return detailed error if missing"""
        required_fields = ['phone1']
        missing_fields = []

        for field in required_fields:
            if not lead_data.get(field) or (isinstance(lead_data[field], str) and not lead_data[field].strip()):
                missing_fields.append(field)

        has_name = bool((lead_data.get('owner_name') or '').strip())
        if not has_name:
            first = (lead_data.get('first_name') or '').strip()
            last = (lead_data.get('last_name') or '').strip()
            if not (first or last):
                missing_fields.append('owner_name')

        if missing_fields:
            return {
                'row_number': row_number,
                'error_type': ImportErrorType.MISSING_REQUIRED,
                'field_name': ', '.join(missing_fields),
                'message': f"Missing required fields: {', '.join(missing_fields)}",
                'suggested_fix': "Ensure all required fields are populated: phone1 and a name"
            }

        return None

    def _deduplicate_phones(self, phone1: str = None, phone2: str = None, phone3: str = None) -> List[str]:
        """Remove duplicate phone numbers within the same lead"""
        phones = []
        for phone in [phone1, phone2, phone3]:
            if phone and phone not in phones:
                phones.append(phone)
        return phones

    def _apply_bulk_and_auto_tags(
        self,
        lead_data: Dict[str, Any],
        bulk_tags: List[str],
        auto_tagging_enabled: bool,
        tagging_options: Dict
    ) -> Dict[str, Any]:
        """Apply bulk tags and auto-tagging to lead data"""

        # Start with existing tags from CSV
        existing_tags = lead_data.get('tags', [])

        # Add bulk tags
        all_tags = existing_tags.copy()
        for tag in bulk_tags:
            if tag and tag not in all_tags:
                all_tags.append(tag)

        # Apply auto-tagging if enabled
        if auto_tagging_enabled and tagging_options:
            auto_tags = self._apply_auto_tagging_logic(lead_data, tagging_options)
            for tag in auto_tags:
                if tag and tag not in all_tags:
                    all_tags.append(tag)

        lead_data['tags'] = all_tags
        return lead_data

    def _apply_auto_tagging_logic(self, lead_data: Dict[str, Any], tagging_options: Dict) -> List[str]:
        """Apply auto-tagging logic based on lead data"""
        auto_tags = []

        # Example auto-tagging rules (can be extended based on tagging_options)
        if tagging_options.get('tag_by_property_type') and lead_data.get('property_type'):
            auto_tags.append(f"property_{lead_data['property_type'].lower()}")

        if tagging_options.get('tag_by_acreage') and lead_data.get('acreage'):
            acreage = float(lead_data['acreage'])
            if acreage > 100:
                auto_tags.append('large_property')
            elif acreage > 50:
                auto_tags.append('medium_property')
            else:
                auto_tags.append('small_property')

        if tagging_options.get('tag_by_value') and lead_data.get('estimated_value'):
            value = int(lead_data['estimated_value'])
            if value > 1000000:
                auto_tags.append('high_value')
            elif value > 500000:
                auto_tags.append('medium_value')
            else:
                auto_tags.append('standard_value')

        return auto_tags

    async def _validate_csv_structure(self, rows: List[Dict[str, str]], column_mappings: Dict[str, str]) -> List[str]:
        """Validate CSV structure and return warnings"""
        warnings = []

        if not rows:
            warnings.append("CSV file appears to be empty")
            return warnings

        # Check if required mapped columns exist in CSV
        csv_columns = set(rows[0].keys()) if rows else set()
        mapped_columns = set(column_mappings.keys())

        missing_columns = mapped_columns - csv_columns
        if missing_columns:
            warnings.append(f"Mapped columns not found in CSV: {', '.join(missing_columns)}")

        # Check for empty rows
        empty_rows = sum(1 for row in rows if all(not (value or '').strip() for value in row.values()))
        if empty_rows > 0:
            warnings.append(f"Found {empty_rows} completely empty rows")

        return warnings

    async def _check_duplicates_batch(
        self,
        phone_numbers: List[str],
        emails: List[str],
        organization_id: str
    ) -> Dict[str, List]:
        """Bulk check for duplicates to optimize performance"""
        duplicate_map = {'phones': [], 'emails': []}
        phone1_col = getattr(Lead, 'phone_number_1', None) or getattr(Lead, 'phone1', None)
        phone2_col = getattr(Lead, 'phone_number_2', None) or getattr(Lead, 'phone2', None)
        phone3_col = getattr(Lead, 'phone_number_3', None) or getattr(Lead, 'phone3', None)

        # Check phone numbers in Lead table
        if phone_numbers:
            # Build conditions list
            conditions = [
                or_(
                    phone1_col.in_(phone_numbers),
                    phone2_col.in_(phone_numbers),
                    phone3_col.in_(phone_numbers)
                )
            ]

            if hasattr(Lead, 'deleted_at'):
                conditions.append(Lead.deleted_at.is_(None))

            # Add organization condition only if organization_id column exists
            if hasattr(Lead, 'organization_id'):
                conditions.append(Lead.organization_id == organization_id)

            phone_query = select(Lead).where(and_(*conditions))
            result = await self.db.execute(phone_query)
            duplicate_leads = result.scalars().all()

            for lead in duplicate_leads:
                for phone in phone_numbers:
                    lead_phones = [
                        getattr(lead, 'phone_number_1', None) or getattr(lead, 'phone1', None),
                        getattr(lead, 'phone_number_2', None) or getattr(lead, 'phone2', None),
                        getattr(lead, 'phone_number_3', None) or getattr(lead, 'phone3', None),
                    ]
                    if phone in lead_phones:
                        duplicate_map['phones'].append({'phone': phone, 'lead_id': lead.id})

        # Check phone numbers in LeadPhone table
        if phone_numbers:
            # Build conditions list
            conditions = [LeadPhone.e164.in_(phone_numbers)]

            # If organization_id exists, join with Lead and filter by organization
            if hasattr(Lead, 'organization_id'):
                phone_query = select(LeadPhone).join(Lead).where(
                    and_(
                        LeadPhone.e164.in_(phone_numbers),
                        Lead.organization_id == organization_id,
                        Lead.deleted_at.is_(None)
                    )
                )
            else:
                phone_query = select(LeadPhone).where(LeadPhone.e164.in_(phone_numbers))

            result = await self.db.execute(phone_query)
            duplicate_phones = result.scalars().all()

            for phone_record in duplicate_phones:
                duplicate_map['phones'].append({
                    'phone': phone_record.e164,
                    'lead_id': phone_record.lead_id
                })

            # De-duplicate entries in duplicate_map['phones'] to reduce noise when organization_id is not available
            if not hasattr(Lead, 'organization_id'):
                seen_phones = set()
                deduplicated_phones = []
                for entry in duplicate_map['phones']:
                    if entry['phone'] not in seen_phones:
                        seen_phones.add(entry['phone'])
                        deduplicated_phones.append(entry)
                duplicate_map['phones'] = deduplicated_phones

        # Check emails
        if emails:
            # Build conditions list
            conditions = [Lead.email.in_(emails)]

            if hasattr(Lead, 'deleted_at'):
                conditions.append(Lead.deleted_at.is_(None))

            # Add organization condition only if organization_id column exists
            if hasattr(Lead, 'organization_id'):
                conditions.append(Lead.organization_id == organization_id)

            email_query = select(Lead).where(and_(*conditions))
            result = await self.db.execute(email_query)
            duplicate_leads = result.scalars().all()

            for lead in duplicate_leads:
                duplicate_map['emails'].append({'email': lead.email, 'lead_id': lead.id})

        return duplicate_map

    async def _find_duplicate_lead_enhanced(
        self,
        lead_data: Dict[str, Any],
        organization_id: str,
        duplicate_map: Dict
    ) -> Optional[Dict]:
        """Enhanced duplicate detection using pre-computed duplicate map"""

        # Check phone numbers
        phones = self._deduplicate_phones(
            lead_data.get('phone1'),
            lead_data.get('phone2'),
            lead_data.get('phone3')
        )

        for phone in phones:
            for dup in duplicate_map['phones']:
                if dup['phone'] == phone:
                    # Build conditions list
                    conditions = [Lead.id == dup['lead_id']]

                    if hasattr(Lead, 'deleted_at'):
                        conditions.append(Lead.deleted_at.is_(None))

                    # Add organization condition only if organization_id column exists
                    if hasattr(Lead, 'organization_id'):
                        conditions.append(Lead.organization_id == organization_id)

                    # Get the full lead record
                    result = await self.db.execute(select(Lead).where(and_(*conditions)))
                    lead = result.scalar_one_or_none()
                    if lead:
                        return {
                            'lead': lead,
                            'match_type': 'phone',
                            'match_value': phone
                        }

        # Check email
        email = lead_data.get('email')
        if email:
            for dup in duplicate_map['emails']:
                if dup['email'] == email:
                    # Build conditions list
                    conditions = [Lead.id == dup['lead_id']]

                    if hasattr(Lead, 'deleted_at'):
                        conditions.append(Lead.deleted_at.is_(None))

                    # Add organization condition only if organization_id column exists
                    if hasattr(Lead, 'organization_id'):
                        conditions.append(Lead.organization_id == organization_id)

                    # Get the full lead record
                    result = await self.db.execute(select(Lead).where(and_(*conditions)))
                    lead = result.scalar_one_or_none()
                    if lead:
                        return {
                            'lead': lead,
                            'match_type': 'email',
                            'match_value': email
                        }

        return None

    async def _update_existing_lead_enhanced(
        self,
        existing_lead: Lead,
        new_data: Dict[str, Any],
        import_batch_id: str,
        row_number: int
    ):
        """Enhanced lead update with smart field merging"""

        # Merge tags instead of replacing
        existing_tags = existing_lead.tags or []
        new_tags = new_data.get('tags', [])
        merged_tags = list(set(existing_tags + new_tags))
        new_data['tags'] = merged_tags

        # Update only non-empty fields, preserving existing data
        field_map = {
            'phone1': 'phone_number_1',
            'phone2': 'phone_number_2',
            'phone3': 'phone_number_3'
        }

        for field, value in new_data.items():
            if hasattr(existing_lead, field):
                if field == 'tags':
                    # Always update tags (merged above)
                    setattr(existing_lead, field, value)
                elif value and str(value).strip():  # Only update if value is not empty
                    setattr(existing_lead, field, value)
            elif field in field_map and hasattr(existing_lead, field_map[field]):
                if value and str(value).strip():
                    setattr(existing_lead, field_map[field], value)

        existing_lead.updated_at = datetime.utcnow()
        if hasattr(existing_lead, 'import_batch_id'):
            existing_lead.import_batch_id = import_batch_id
        if hasattr(existing_lead, 'import_row_number'):
            existing_lead.import_row_number = row_number

        # Update phone numbers if they changed
        await self._update_lead_phones(existing_lead, new_data)

    async def _update_lead_phones(self, lead: Lead, new_data: Dict[str, Any]):
        """Update lead phone records"""
        # Handle phone number updates
        phone_field_map = {
            'phone1': 'phone_number_1',
            'phone2': 'phone_number_2',
            'phone3': 'phone_number_3'
        }
        for phone_field in ['phone1', 'phone2', 'phone3']:
            if phone_field in new_data and new_data[phone_field]:
                # Update lead field for backward compatibility
                target_field = phone_field_map.get(phone_field, phone_field)
                if hasattr(lead, target_field):
                    setattr(lead, target_field, new_data[phone_field])

                # Check if phone already exists in LeadPhone
                existing_phone_query = select(LeadPhone).where(
                    and_(
                        LeadPhone.lead_id == lead.id,
                        LeadPhone.e164 == new_data[phone_field]
                    )
                )
                result = await self.db.execute(existing_phone_query)
                existing_phone = result.scalar_one_or_none()

                if not existing_phone:
                    # Create new phone record
                    phone_record = LeadPhone(
                        id=str(uuid.uuid4()),
                        lead_id=lead.id,
                        e164=new_data[phone_field],
                        label=phone_field,
                        is_primary=(phone_field == 'phone1')
                    )
                    self.db.add(phone_record)

    async def _create_new_lead_enhanced(
        self,
        lead_data: Dict[str, Any],
        organization_id: str,
        user_id: str,
        import_batch_id: str,
        row_number: int
    ):
        """Enhanced lead creation with comprehensive tracking"""

        # Generate import_batch_id as integer if not already
        if isinstance(import_batch_id, str):
            try:
                import_batch_id = int(datetime.utcnow().timestamp())
            except:
                import_batch_id = int(datetime.utcnow().timestamp())

        # Create main lead record with tracking fields
        lead_kwargs = {
            'consent_status': 'imported',  # Default consent status for imports
        }

        # Add organization_id only if the column exists
        if hasattr(Lead, 'organization_id'):
            lead_kwargs['organization_id'] = organization_id
        if hasattr(Lead, 'created_by'):
            lead_kwargs['created_by'] = user_id
        if hasattr(Lead, 'import_batch_id'):
            lead_kwargs['import_batch_id'] = import_batch_id
        if hasattr(Lead, 'import_row_number'):
            lead_kwargs['import_row_number'] = row_number

        # Add lead data fields (excluding phone fields which are handled separately)
        for k, v in lead_data.items():
            if hasattr(Lead, k) and k not in ['phone1', 'phone2', 'phone3']:
                lead_kwargs[k] = v
            elif k == 'owner_name' and hasattr(Lead, 'owner_name'):
                lead_kwargs[k] = v

        lead = Lead(**lead_kwargs)

        # Set phone fields for backward compatibility
        phone_field_map = {
            'phone1': 'phone_number_1',
            'phone2': 'phone_number_2',
            'phone3': 'phone_number_3'
        }
        for phone_field in ['phone1', 'phone2', 'phone3']:
            if phone_field in lead_data and lead_data[phone_field]:
                target_field = phone_field_map.get(phone_field, phone_field)
                if hasattr(lead, target_field):
                    setattr(lead, target_field, lead_data[phone_field])

        self.db.add(lead)
        await self.db.flush()  # Get the generated lead.id

        # Handle phone numbers with deduplication
        phone_numbers = self._deduplicate_phones(
            lead_data.get('phone1'),
            lead_data.get('phone2'),
            lead_data.get('phone3')
        )

        # Create LeadPhone records
        for idx, phone in enumerate(phone_numbers):
            if phone:
                phone_record = LeadPhone(
                    id=str(uuid.uuid4()),
                    lead_id=lead.id,
                    e164=phone,
                    label=f'phone{idx + 1}',
                    is_primary=(idx == 0)
                )
                self.db.add(phone_record)

    def _generate_import_batch_id(self) -> str:
        """Generate a unique import batch ID"""
        timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
        unique_id = str(uuid.uuid4())[:8]
        return f"import_{timestamp}_{unique_id}"

    def _cleanup_old_imports(self):
        """Clean up old import status entries from cache"""
        current_time = datetime.utcnow()
        cutoff_time = current_time - timedelta(hours=1)

        # Remove imports older than 1 hour
        expired_imports = [
            import_id for import_id, progress in _import_status_cache.items()
            if progress.started_at < cutoff_time
        ]

        for import_id in expired_imports:
            del _import_status_cache[import_id]

        if expired_imports:
            logger.info(f"Cleaned up {len(expired_imports)} expired import status entries")

    async def get_import_status(self, import_id: str, organization_id: str) -> Optional[LeadImportResult]:
        """Get the status of an import operation with real-time progress"""

        # Retrieve from cache
        progress = _import_status_cache.get(import_id)
        if not progress:
            return None

        # Convert progress to LeadImportResult
        result = LeadImportResult(
            import_id=import_id,
            status=progress.status,
            total_rows=progress.total_rows,
            processed_rows=progress.current_row,
            successful_imports=progress.success_count,
            failed_imports=progress.error_count,
            duplicate_skips=progress.duplicate_skips,
            errors=[],
            created_at=progress.started_at,
            completed_at=progress.updated_at if progress.status in ['completed', 'failed'] else None,
            progress_percentage=progress.progress_pct,
            estimated_time_remaining=progress.eta_seconds,
            current_batch=progress.current_batch,
            total_batches=progress.total_batches,
            import_batch_id=None,  # Not tracked in progress
            validation_warnings=[]
        )

        return result
