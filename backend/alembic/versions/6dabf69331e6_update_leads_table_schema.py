"""Update leads table schema to match current models

Revision ID: 6dabf69331e6
Revises: 53d6fd907b29
Create Date: 2025-09-04 13:32:09.976022

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '6dabf69331e6'
down_revision = '53d6fd907b29'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ### Update leads table to match current model ###
    connection = op.get_bind()
    inspector = sa.inspect(connection)
    existing_columns = {col["name"] for col in inspector.get_columns("leads")}
    if "first_name" in existing_columns:
        return
    
    # Add new columns to leads table
    op.add_column('leads', sa.Column('first_name', sa.String(), nullable=True))
    op.add_column('leads', sa.Column('last_name', sa.String(), nullable=True))
    op.add_column('leads', sa.Column('full_name', sa.String(), nullable=True))
    op.add_column('leads', sa.Column('phone1', sa.String(), nullable=True))
    op.add_column('leads', sa.Column('phone2', sa.String(), nullable=True))
    op.add_column('leads', sa.Column('phone3', sa.String(), nullable=True))
    op.add_column('leads', sa.Column('address_line1', sa.String(), nullable=True))
    op.add_column('leads', sa.Column('address_line2', sa.String(), nullable=True))
    op.add_column('leads', sa.Column('county', sa.String(), nullable=True))
    op.add_column('leads', sa.Column('parcel_id', sa.String(), nullable=True))
    op.add_column('leads', sa.Column('estimated_value', sa.Integer(), nullable=True))
    op.add_column('leads', sa.Column('property_address', sa.String(), nullable=True))
    op.add_column('leads', sa.Column('consent_status', sa.String(), nullable=True))
    op.add_column('leads', sa.Column('consent_date', sa.DateTime(timezone=True), nullable=True))
    op.add_column('leads', sa.Column('last_contacted_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('leads', sa.Column('last_campaign_id', sa.Integer(), nullable=True))
    op.add_column('leads', sa.Column('total_messages_sent', sa.Integer(), nullable=True))
    op.add_column('leads', sa.Column('total_messages_received', sa.Integer(), nullable=True))
    op.add_column('leads', sa.Column('custom_fields', sa.JSON(), nullable=True))
    op.add_column('leads', sa.Column('replied_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('leads', sa.Column('conversion_event', sa.String(), nullable=True))
    op.add_column('leads', sa.Column('conversion_date', sa.DateTime(timezone=True), nullable=True))
    op.add_column('leads', sa.Column('conversion_value', sa.Integer(), nullable=True))
    op.add_column('leads', sa.Column('phone1_valid', sa.Boolean(), nullable=True))
    op.add_column('leads', sa.Column('phone2_valid', sa.Boolean(), nullable=True))
    op.add_column('leads', sa.Column('phone3_valid', sa.Boolean(), nullable=True))
    op.add_column('leads', sa.Column('address_valid', sa.Boolean(), nullable=True))
    op.add_column('leads', sa.Column('import_batch_id', sa.Integer(), nullable=True))
    op.add_column('leads', sa.Column('import_row_number', sa.Integer(), nullable=True))
    op.add_column('leads', sa.Column('created_by', sa.Integer(), nullable=True))
    op.add_column('leads', sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True))
    
    # Migrate data from old columns to new columns
    op.execute("""
        UPDATE leads SET 
            first_name = COALESCE(SPLIT_PART(owner_name, ' ', 1), ''),
            last_name = COALESCE(NULLIF(SUBSTRING(owner_name FROM POSITION(' ' IN owner_name) + 1), ''), ''),
            full_name = owner_name,
            phone1 = phone_number_1,
            phone2 = phone_number_2, 
            phone3 = phone_number_3,
            address_line1 = street_address,
            consent_status = 'unknown',
            total_messages_sent = 0,
            total_messages_received = 0,
            custom_fields = '{}',
            phone1_valid = true,
            phone2_valid = true,
            phone3_valid = true,
            address_valid = true,
            created_by = 1
    """)
    
    # Make required fields non-nullable after data migration
    op.alter_column('leads', 'first_name', nullable=False)
    op.alter_column('leads', 'last_name', nullable=False)
    op.alter_column('leads', 'phone1', nullable=False)
    
    # Create indexes for new columns
    op.create_index(op.f('ix_leads_first_name'), 'leads', ['first_name'], unique=False)
    op.create_index(op.f('ix_leads_last_name'), 'leads', ['last_name'], unique=False)
    op.create_index(op.f('ix_leads_full_name'), 'leads', ['full_name'], unique=False)
    op.create_index(op.f('ix_leads_phone1'), 'leads', ['phone1'], unique=False)
    op.create_index(op.f('ix_leads_phone2'), 'leads', ['phone2'], unique=False)
    op.create_index(op.f('ix_leads_phone3'), 'leads', ['phone3'], unique=False)
    op.create_index(op.f('ix_leads_county'), 'leads', ['county'], unique=False)
    op.create_index(op.f('ix_leads_parcel_id'), 'leads', ['parcel_id'], unique=False)
    op.create_index(op.f('ix_leads_created_at'), 'leads', ['created_at'], unique=False)
    
    # Update column types to match model (with proper type casting)
    op.execute("ALTER TABLE leads ALTER COLUMN email TYPE VARCHAR")
    op.execute("ALTER TABLE leads ALTER COLUMN city TYPE VARCHAR")
    op.execute("ALTER TABLE leads ALTER COLUMN state TYPE VARCHAR")
    op.execute("ALTER TABLE leads ALTER COLUMN zip_code TYPE VARCHAR")
    op.execute("ALTER TABLE leads ALTER COLUMN country TYPE VARCHAR")
    op.execute("ALTER TABLE leads ALTER COLUMN property_type TYPE VARCHAR")
    op.execute("ALTER TABLE leads ALTER COLUMN lead_source TYPE VARCHAR")
    op.execute("ALTER TABLE leads ALTER COLUMN lead_score TYPE VARCHAR USING CASE WHEN lead_score = 1 THEN 'cold' WHEN lead_score = 2 THEN 'warm' WHEN lead_score = 3 THEN 'hot' ELSE 'cold' END")
    op.execute("ALTER TABLE leads ALTER COLUMN status TYPE VARCHAR")
    op.execute("ALTER TABLE leads ALTER COLUMN opt_out_reason TYPE VARCHAR")
    op.execute("ALTER TABLE leads ALTER COLUMN tags TYPE JSON USING CASE WHEN tags IS NULL OR tags = '' THEN '[]'::json ELSE ('['||E'\"'||replace(tags, ',', E'\",\"')||E'\"'||']')::json END")
    op.execute("ALTER TABLE leads ALTER COLUMN opt_out_date TYPE TIMESTAMPTZ")
    op.execute("ALTER TABLE leads ALTER COLUMN created_at TYPE TIMESTAMPTZ")
    op.execute("ALTER TABLE leads ALTER COLUMN updated_at TYPE TIMESTAMPTZ")
    
    # Make old columns nullable to avoid conflicts, then drop them
    op.alter_column('leads', 'owner_name', nullable=True)
    op.alter_column('leads', 'phone_number_1', nullable=True)
    
    # Drop old columns that are no longer needed
    op.drop_column('leads', 'square_feet')
    op.drop_column('leads', 'ownership_length')
    op.drop_column('leads', 'tax_year')
    op.drop_column('leads', 'property_taxes')
    op.drop_column('leads', 'last_tax_assessment')
    op.drop_column('leads', 'year_built')
    op.drop_column('leads', 'last_contacted')
    op.drop_column('leads', 'do_not_contact')
    op.drop_column('leads', 'bedrooms')
    op.drop_column('leads', 'assessed_value')
    op.drop_column('leads', 'source_of_lead')
    op.drop_column('leads', 'occupancy_status')
    op.drop_column('leads', 'bathrooms')
    op.drop_column('leads', 'next_follow_up')
    op.drop_column('leads', 'property_value')
    op.drop_column('leads', 'asking_price')
    op.drop_column('leads', 'ownership_type')


def downgrade() -> None:
    # ### Reverse the upgrade operation ###
    op.drop_index(op.f('ix_leads_created_at'), table_name='leads')
    op.drop_index(op.f('ix_leads_parcel_id'), table_name='leads')
    op.drop_index(op.f('ix_leads_county'), table_name='leads')
    op.drop_index(op.f('ix_leads_phone3'), table_name='leads')
    op.drop_index(op.f('ix_leads_phone2'), table_name='leads')
    op.drop_index(op.f('ix_leads_phone1'), table_name='leads')
    op.drop_index(op.f('ix_leads_full_name'), table_name='leads')
    op.drop_index(op.f('ix_leads_last_name'), table_name='leads')
    op.drop_index(op.f('ix_leads_first_name'), table_name='leads')
    
    op.drop_column('leads', 'deleted_at')
    op.drop_column('leads', 'created_by')
    op.drop_column('leads', 'import_row_number')
    op.drop_column('leads', 'import_batch_id')
    op.drop_column('leads', 'address_valid')
    op.drop_column('leads', 'phone3_valid')
    op.drop_column('leads', 'phone2_valid')
    op.drop_column('leads', 'phone1_valid')
    op.drop_column('leads', 'conversion_value')
    op.drop_column('leads', 'conversion_date')
    op.drop_column('leads', 'conversion_event')
    op.drop_column('leads', 'replied_at')
    op.drop_column('leads', 'custom_fields')
    op.drop_column('leads', 'total_messages_received')
    op.drop_column('leads', 'total_messages_sent')
    op.drop_column('leads', 'last_campaign_id')
    op.drop_column('leads', 'last_contacted_at')
    op.drop_column('leads', 'consent_date')
    op.drop_column('leads', 'consent_status')
    op.drop_column('leads', 'property_address')
    op.drop_column('leads', 'estimated_value')
    op.drop_column('leads', 'parcel_id')
    op.drop_column('leads', 'county')
    op.drop_column('leads', 'address_line2')
    op.drop_column('leads', 'address_line1')
    op.drop_column('leads', 'phone3')
    op.drop_column('leads', 'phone2')
    op.drop_column('leads', 'phone1')
    op.drop_column('leads', 'full_name')
    op.drop_column('leads', 'last_name')
    op.drop_column('leads', 'first_name')
