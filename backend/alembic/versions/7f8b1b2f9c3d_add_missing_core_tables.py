"""Add missing core tables for Control Tower

Revision ID: 7f8b1b2f9c3d
Revises: 6dabf69331e6
Create Date: 2025-01-02 17:05:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = '7f8b1b2f9c3d'
down_revision = '6dabf69331e6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute('CREATE EXTENSION IF NOT EXISTS "pgcrypto"')

    # Auth: roles, permissions, sessions, api keys
    op.create_table(
        'roles',
        sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('is_system', sa.Boolean(), server_default=sa.text('false'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_roles')),
        sa.UniqueConstraint('name', name=op.f('uq_roles_name')),
    )
    op.create_index(op.f('ix_roles_id'), 'roles', ['id'], unique=False)

    op.create_table(
        'permissions',
        sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('name', sa.String(length=150), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_permissions')),
        sa.UniqueConstraint('name', name=op.f('uq_permissions_name')),
    )
    op.create_index(op.f('ix_permissions_id'), 'permissions', ['id'], unique=False)

    op.create_table(
        'role_permissions',
        sa.Column('role_id', sa.UUID(), nullable=False),
        sa.Column('permission_id', sa.UUID(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['permission_id'], ['permissions.id'], ondelete='CASCADE', name=op.f('fk_role_permissions_permission_id_permissions')),
        sa.ForeignKeyConstraint(['role_id'], ['roles.id'], ondelete='CASCADE', name=op.f('fk_role_permissions_role_id_roles')),
        sa.PrimaryKeyConstraint('role_id', 'permission_id', name=op.f('pk_role_permissions')),
    )
    op.create_index(op.f('ix_role_permissions_permission_id'), 'role_permissions', ['permission_id'], unique=False)

    op.create_table(
        'user_roles',
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('role_id', sa.UUID(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['role_id'], ['roles.id'], ondelete='CASCADE', name=op.f('fk_user_roles_role_id_roles')),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE', name=op.f('fk_user_roles_user_id_users')),
        sa.PrimaryKeyConstraint('user_id', 'role_id', name=op.f('pk_user_roles')),
    )
    op.create_index(op.f('ix_user_roles_role_id'), 'user_roles', ['role_id'], unique=False)

    op.create_table(
        'api_keys',
        sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('organization_id', sa.UUID(), nullable=False),
        sa.Column('name', sa.String(length=120), nullable=False),
        sa.Column('key_prefix', sa.String(length=12), nullable=False),
        sa.Column('key_hash', sa.Text(), nullable=False),
        sa.Column('scopes', postgresql.JSONB(astext_type=sa.Text()), server_default=sa.text("'[]'::jsonb"), nullable=False),
        sa.Column('last_used_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('revoked_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_by', sa.UUID(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], name=op.f('fk_api_keys_created_by_users')),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE', name=op.f('fk_api_keys_organization_id_organizations')),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_api_keys')),
        sa.UniqueConstraint('key_prefix', name=op.f('uq_api_keys_key_prefix')),
    )
    op.create_index(op.f('ix_api_keys_organization_id'), 'api_keys', ['organization_id'], unique=False)
    op.create_index(op.f('ix_api_keys_created_by'), 'api_keys', ['created_by'], unique=False)

    op.create_table(
        'user_sessions',
        sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('organization_id', sa.UUID(), nullable=False),
        sa.Column('refresh_token_hash', sa.Text(), nullable=False),
        sa.Column('ip_address', sa.String(length=64), nullable=True),
        sa.Column('user_agent', sa.Text(), nullable=True),
        sa.Column('session_metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('last_used_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('revoked_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE', name=op.f('fk_user_sessions_organization_id_organizations')),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE', name=op.f('fk_user_sessions_user_id_users')),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_user_sessions')),
    )
    op.create_index(op.f('ix_user_sessions_user_id'), 'user_sessions', ['user_id'], unique=False)
    op.create_index(op.f('ix_user_sessions_organization_id'), 'user_sessions', ['organization_id'], unique=False)
    op.create_index(op.f('ix_user_sessions_expires_at'), 'user_sessions', ['expires_at'], unique=False)

    # Leads: imports + normalized tags
    op.create_table(
        'lead_imports',
        sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('organization_id', sa.UUID(), nullable=False),
        sa.Column('created_by', sa.UUID(), nullable=True),
        sa.Column('file_name', sa.Text(), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False),
        sa.Column('total_rows', sa.Integer(), nullable=True),
        sa.Column('processed_rows', sa.Integer(), nullable=True),
        sa.Column('success_count', sa.Integer(), nullable=True),
        sa.Column('error_count', sa.Integer(), nullable=True),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('mapping', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('options', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], name=op.f('fk_lead_imports_created_by_users')),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE', name=op.f('fk_lead_imports_organization_id_organizations')),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_lead_imports')),
    )
    op.create_index(op.f('ix_lead_imports_organization_id'), 'lead_imports', ['organization_id'], unique=False)
    op.create_index(op.f('ix_lead_imports_status'), 'lead_imports', ['status'], unique=False)
    op.create_index(op.f('ix_lead_imports_created_at'), 'lead_imports', ['created_at'], unique=False)

    op.create_table(
        'lead_import_rows',
        sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('import_id', sa.UUID(), nullable=False),
        sa.Column('lead_id', sa.UUID(), nullable=True),
        sa.Column('row_number', sa.Integer(), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=True),
        sa.Column('error_type', sa.String(length=100), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('raw_data', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['import_id'], ['lead_imports.id'], ondelete='CASCADE', name=op.f('fk_lead_import_rows_import_id_lead_imports')),
        sa.ForeignKeyConstraint(['lead_id'], ['leads.id'], name=op.f('fk_lead_import_rows_lead_id_leads')),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_lead_import_rows')),
    )
    op.create_index(op.f('ix_lead_import_rows_import_id'), 'lead_import_rows', ['import_id'], unique=False)
    op.create_index(op.f('ix_lead_import_rows_status'), 'lead_import_rows', ['status'], unique=False)
    op.create_index(op.f('ix_lead_import_rows_row_number'), 'lead_import_rows', ['row_number'], unique=False)

    op.create_table(
        'tags',
        sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('organization_id', sa.UUID(), nullable=False),
        sa.Column('name', sa.String(length=80), nullable=False),
        sa.Column('color', sa.String(length=20), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_tags')),
        sa.UniqueConstraint('organization_id', 'name', name=op.f('uq_tags_org_name')),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE', name=op.f('fk_tags_organization_id_organizations')),
    )
    op.create_index(op.f('ix_tags_organization_id'), 'tags', ['organization_id'], unique=False)

    op.create_table(
        'lead_tags',
        sa.Column('lead_id', sa.UUID(), nullable=False),
        sa.Column('tag_id', sa.UUID(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['lead_id'], ['leads.id'], ondelete='CASCADE', name=op.f('fk_lead_tags_lead_id_leads')),
        sa.ForeignKeyConstraint(['tag_id'], ['tags.id'], ondelete='CASCADE', name=op.f('fk_lead_tags_tag_id_tags')),
        sa.PrimaryKeyConstraint('lead_id', 'tag_id', name=op.f('pk_lead_tags')),
    )
    op.create_index(op.f('ix_lead_tags_tag_id'), 'lead_tags', ['tag_id'], unique=False)

    # Campaigns: schedules, audiences, metrics
    op.create_table(
        'campaign_schedules',
        sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('campaign_id', sa.UUID(), nullable=False),
        sa.Column('timezone', sa.String(length=64), nullable=True),
        sa.Column('start_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('end_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('quiet_hours_start', sa.String(length=10), nullable=True),
        sa.Column('quiet_hours_end', sa.String(length=10), nullable=True),
        sa.Column('allowed_days', postgresql.ARRAY(sa.Integer()), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['campaign_id'], ['campaigns.id'], ondelete='CASCADE', name=op.f('fk_campaign_schedules_campaign_id_campaigns')),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_campaign_schedules')),
        sa.UniqueConstraint('campaign_id', name=op.f('uq_campaign_schedules_campaign_id')),
    )
    op.create_index(op.f('ix_campaign_schedules_campaign_id'), 'campaign_schedules', ['campaign_id'], unique=False)

    op.create_table(
        'campaign_audiences',
        sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('campaign_id', sa.UUID(), nullable=False),
        sa.Column('criteria', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('lead_count_estimate', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['campaign_id'], ['campaigns.id'], ondelete='CASCADE', name=op.f('fk_campaign_audiences_campaign_id_campaigns')),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_campaign_audiences')),
    )
    op.create_index(op.f('ix_campaign_audiences_campaign_id'), 'campaign_audiences', ['campaign_id'], unique=False)

    op.create_table(
        'campaign_metrics_daily',
        sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('campaign_id', sa.UUID(), nullable=False),
        sa.Column('organization_id', sa.UUID(), nullable=False),
        sa.Column('metric_date', sa.Date(), nullable=False),
        sa.Column('messages_sent', sa.Integer(), server_default=sa.text('0'), nullable=False),
        sa.Column('delivered', sa.Integer(), server_default=sa.text('0'), nullable=False),
        sa.Column('replies', sa.Integer(), server_default=sa.text('0'), nullable=False),
        sa.Column('opt_outs', sa.Integer(), server_default=sa.text('0'), nullable=False),
        sa.Column('failed', sa.Integer(), server_default=sa.text('0'), nullable=False),
        sa.Column('cost', sa.Numeric(12, 4), nullable=True),
        sa.Column('revenue', sa.Numeric(12, 4), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['campaign_id'], ['campaigns.id'], ondelete='CASCADE', name=op.f('fk_campaign_metrics_daily_campaign_id_campaigns')),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE', name=op.f('fk_campaign_metrics_daily_organization_id_organizations')),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_campaign_metrics_daily')),
        sa.UniqueConstraint('campaign_id', 'metric_date', name=op.f('uq_campaign_metrics_daily_campaign_date')),
    )
    op.create_index(op.f('ix_campaign_metrics_daily_organization_id'), 'campaign_metrics_daily', ['organization_id'], unique=False)
    op.create_index(op.f('ix_campaign_metrics_daily_metric_date'), 'campaign_metrics_daily', ['metric_date'], unique=False)

    op.create_table(
        'campaign_events',
        sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('campaign_id', sa.UUID(), nullable=False),
        sa.Column('organization_id', sa.UUID(), nullable=False),
        sa.Column('event_type', sa.String(length=120), nullable=False),
        sa.Column('payload', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['campaign_id'], ['campaigns.id'], ondelete='CASCADE', name=op.f('fk_campaign_events_campaign_id_campaigns')),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE', name=op.f('fk_campaign_events_organization_id_organizations')),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_campaign_events')),
    )
    op.create_index(op.f('ix_campaign_events_campaign_id'), 'campaign_events', ['campaign_id'], unique=False)
    op.create_index(op.f('ix_campaign_events_created_at'), 'campaign_events', ['created_at'], unique=False)

    # Templates: performance metrics
    op.create_table(
        'template_metrics_daily',
        sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('template_id', sa.UUID(), nullable=False),
        sa.Column('organization_id', sa.UUID(), nullable=False),
        sa.Column('metric_date', sa.Date(), nullable=False),
        sa.Column('sends', sa.Integer(), server_default=sa.text('0'), nullable=False),
        sa.Column('deliveries', sa.Integer(), server_default=sa.text('0'), nullable=False),
        sa.Column('replies', sa.Integer(), server_default=sa.text('0'), nullable=False),
        sa.Column('opt_outs', sa.Integer(), server_default=sa.text('0'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE', name=op.f('fk_template_metrics_daily_organization_id_organizations')),
        sa.ForeignKeyConstraint(['template_id'], ['templates.id'], ondelete='CASCADE', name=op.f('fk_template_metrics_daily_template_id_templates')),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_template_metrics_daily')),
        sa.UniqueConstraint('template_id', 'metric_date', name=op.f('uq_template_metrics_daily_template_date')),
    )
    op.create_index(op.f('ix_template_metrics_daily_organization_id'), 'template_metrics_daily', ['organization_id'], unique=False)
    op.create_index(op.f('ix_template_metrics_daily_metric_date'), 'template_metrics_daily', ['metric_date'], unique=False)

    # Phone numbers: assignments + metrics
    op.create_table(
        'phone_number_assignments',
        sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('phone_number_id', sa.UUID(), nullable=False),
        sa.Column('campaign_id', sa.UUID(), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=True),
        sa.Column('assigned_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('unassigned_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['campaign_id'], ['campaigns.id'], ondelete='CASCADE', name=op.f('fk_phone_number_assignments_campaign_id_campaigns')),
        sa.ForeignKeyConstraint(['phone_number_id'], ['phone_numbers.id'], ondelete='CASCADE', name=op.f('fk_phone_number_assignments_phone_number_id_phone_numbers')),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_phone_number_assignments')),
    )
    op.create_index(op.f('ix_phone_number_assignments_phone_number_id'), 'phone_number_assignments', ['phone_number_id'], unique=False)
    op.create_index(op.f('ix_phone_number_assignments_campaign_id'), 'phone_number_assignments', ['campaign_id'], unique=False)

    op.create_table(
        'phone_number_metrics_daily',
        sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('phone_number_id', sa.UUID(), nullable=False),
        sa.Column('organization_id', sa.UUID(), nullable=False),
        sa.Column('metric_date', sa.Date(), nullable=False),
        sa.Column('sent', sa.Integer(), server_default=sa.text('0'), nullable=False),
        sa.Column('delivered', sa.Integer(), server_default=sa.text('0'), nullable=False),
        sa.Column('failed', sa.Integer(), server_default=sa.text('0'), nullable=False),
        sa.Column('opt_outs', sa.Integer(), server_default=sa.text('0'), nullable=False),
        sa.Column('health_score', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE', name=op.f('fk_phone_number_metrics_daily_organization_id_organizations')),
        sa.ForeignKeyConstraint(['phone_number_id'], ['phone_numbers.id'], ondelete='CASCADE', name=op.f('fk_phone_number_metrics_daily_phone_number_id_phone_numbers')),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_phone_number_metrics_daily')),
        sa.UniqueConstraint('phone_number_id', 'metric_date', name=op.f('uq_phone_number_metrics_daily_number_date')),
    )
    op.create_index(op.f('ix_phone_number_metrics_daily_organization_id'), 'phone_number_metrics_daily', ['organization_id'], unique=False)
    op.create_index(op.f('ix_phone_number_metrics_daily_metric_date'), 'phone_number_metrics_daily', ['metric_date'], unique=False)

    # Compliance: keyword events + reports
    op.create_table(
        'compliance_events',
        sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('organization_id', sa.UUID(), nullable=False),
        sa.Column('lead_id', sa.UUID(), nullable=True),
        sa.Column('message_id', sa.UUID(), nullable=True),
        sa.Column('phone_number', sa.String(length=30), nullable=False),
        sa.Column('keyword', sa.String(length=30), nullable=True),
        sa.Column('action', sa.String(length=50), nullable=True),
        sa.Column('source', sa.String(length=50), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['lead_id'], ['leads.id'], name=op.f('fk_compliance_events_lead_id_leads')),
        sa.ForeignKeyConstraint(['message_id'], ['messages.id'], name=op.f('fk_compliance_events_message_id_messages')),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE', name=op.f('fk_compliance_events_organization_id_organizations')),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_compliance_events')),
    )
    op.create_index(op.f('ix_compliance_events_organization_id'), 'compliance_events', ['organization_id'], unique=False)
    op.create_index(op.f('ix_compliance_events_phone_number'), 'compliance_events', ['phone_number'], unique=False)
    op.create_index(op.f('ix_compliance_events_created_at'), 'compliance_events', ['created_at'], unique=False)

    op.create_table(
        'compliance_reports',
        sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('organization_id', sa.UUID(), nullable=False),
        sa.Column('report_type', sa.String(length=80), nullable=False),
        sa.Column('status', sa.String(length=40), nullable=False),
        sa.Column('period_start', sa.DateTime(timezone=True), nullable=True),
        sa.Column('period_end', sa.DateTime(timezone=True), nullable=True),
        sa.Column('format', sa.String(length=20), nullable=True),
        sa.Column('storage_url', sa.Text(), nullable=True),
        sa.Column('created_by', sa.UUID(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('report_metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], name=op.f('fk_compliance_reports_created_by_users')),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE', name=op.f('fk_compliance_reports_organization_id_organizations')),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_compliance_reports')),
    )
    op.create_index(op.f('ix_compliance_reports_organization_id'), 'compliance_reports', ['organization_id'], unique=False)
    op.create_index(op.f('ix_compliance_reports_report_type'), 'compliance_reports', ['report_type'], unique=False)
    op.create_index(op.f('ix_compliance_reports_created_at'), 'compliance_reports', ['created_at'], unique=False)

    # Analytics: timeseries + ROI
    op.create_table(
        'analytics_timeseries',
        sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('organization_id', sa.UUID(), nullable=False),
        sa.Column('metric', sa.String(length=120), nullable=False),
        sa.Column('period_start', sa.DateTime(timezone=True), nullable=False),
        sa.Column('period_end', sa.DateTime(timezone=True), nullable=True),
        sa.Column('value', sa.Numeric(18, 4), nullable=False),
        sa.Column('dimensions', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE', name=op.f('fk_analytics_timeseries_organization_id_organizations')),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_analytics_timeseries')),
    )
    op.create_index(op.f('ix_analytics_timeseries_org_metric_period'), 'analytics_timeseries', ['organization_id', 'metric', 'period_start'], unique=False)

    op.create_table(
        'campaign_roi',
        sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('organization_id', sa.UUID(), nullable=False),
        sa.Column('campaign_id', sa.UUID(), nullable=False),
        sa.Column('period_start', sa.DateTime(timezone=True), nullable=True),
        sa.Column('period_end', sa.DateTime(timezone=True), nullable=True),
        sa.Column('cost', sa.Numeric(12, 4), nullable=True),
        sa.Column('revenue', sa.Numeric(12, 4), nullable=True),
        sa.Column('roi', sa.Numeric(12, 4), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['campaign_id'], ['campaigns.id'], ondelete='CASCADE', name=op.f('fk_campaign_roi_campaign_id_campaigns')),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE', name=op.f('fk_campaign_roi_organization_id_organizations')),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_campaign_roi')),
        sa.UniqueConstraint('campaign_id', 'period_start', 'period_end', name=op.f('uq_campaign_roi_period')),
    )
    op.create_index(op.f('ix_campaign_roi_organization_id'), 'campaign_roi', ['organization_id'], unique=False)

    # Integrations: configs + webhooks + health
    op.create_table(
        'integrations',
        sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('organization_id', sa.UUID(), nullable=False),
        sa.Column('provider', sa.String(length=80), nullable=False),
        sa.Column('status', sa.String(length=40), nullable=True),
        sa.Column('config', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('last_checked_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE', name=op.f('fk_integrations_organization_id_organizations')),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_integrations')),
        sa.UniqueConstraint('organization_id', 'provider', name=op.f('uq_integrations_org_provider')),
    )
    op.create_index(op.f('ix_integrations_organization_id'), 'integrations', ['organization_id'], unique=False)

    op.create_table(
        'webhooks',
        sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('organization_id', sa.UUID(), nullable=False),
        sa.Column('provider', sa.String(length=80), nullable=True),
        sa.Column('url', sa.Text(), nullable=False),
        sa.Column('secret', sa.Text(), nullable=True),
        sa.Column('events', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('is_active', sa.Boolean(), server_default=sa.text('true'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE', name=op.f('fk_webhooks_organization_id_organizations')),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_webhooks')),
    )
    op.create_index(op.f('ix_webhooks_organization_id'), 'webhooks', ['organization_id'], unique=False)
    op.create_index(op.f('ix_webhooks_provider'), 'webhooks', ['provider'], unique=False)

    op.create_table(
        'webhook_deliveries',
        sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('webhook_id', sa.UUID(), nullable=False),
        sa.Column('status', sa.String(length=40), nullable=True),
        sa.Column('response_code', sa.Integer(), nullable=True),
        sa.Column('response_body', sa.Text(), nullable=True),
        sa.Column('attempt_count', sa.Integer(), server_default=sa.text('0'), nullable=False),
        sa.Column('next_retry_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['webhook_id'], ['webhooks.id'], ondelete='CASCADE', name=op.f('fk_webhook_deliveries_webhook_id_webhooks')),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_webhook_deliveries')),
    )
    op.create_index(op.f('ix_webhook_deliveries_webhook_id'), 'webhook_deliveries', ['webhook_id'], unique=False)
    op.create_index(op.f('ix_webhook_deliveries_created_at'), 'webhook_deliveries', ['created_at'], unique=False)

    op.create_table(
        'integration_health_checks',
        sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('integration_id', sa.UUID(), nullable=False),
        sa.Column('status', sa.String(length=40), nullable=True),
        sa.Column('details', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('checked_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['integration_id'], ['integrations.id'], ondelete='CASCADE', name=op.f('fk_integration_health_checks_integration_id_integrations')),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_integration_health_checks')),
    )
    op.create_index(op.f('ix_integration_health_checks_integration_id'), 'integration_health_checks', ['integration_id'], unique=False)
    op.create_index(op.f('ix_integration_health_checks_checked_at'), 'integration_health_checks', ['checked_at'], unique=False)

    op.create_table(
        'api_usage',
        sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('organization_id', sa.UUID(), nullable=False),
        sa.Column('api_key_id', sa.UUID(), nullable=True),
        sa.Column('endpoint', sa.Text(), nullable=False),
        sa.Column('method', sa.String(length=10), nullable=True),
        sa.Column('status_code', sa.Integer(), nullable=True),
        sa.Column('latency_ms', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['api_key_id'], ['api_keys.id'], name=op.f('fk_api_usage_api_key_id_api_keys')),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE', name=op.f('fk_api_usage_organization_id_organizations')),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_api_usage')),
    )
    op.create_index(op.f('ix_api_usage_organization_id'), 'api_usage', ['organization_id'], unique=False)
    op.create_index(op.f('ix_api_usage_api_key_id'), 'api_usage', ['api_key_id'], unique=False)
    op.create_index(op.f('ix_api_usage_created_at'), 'api_usage', ['created_at'], unique=False)

    # System/internal: jobs, locks, sockets, exports
    op.create_table(
        'background_jobs',
        sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('organization_id', sa.UUID(), nullable=True),
        sa.Column('job_type', sa.String(length=120), nullable=False),
        sa.Column('status', sa.String(length=40), nullable=False),
        sa.Column('payload', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('attempts', sa.Integer(), server_default=sa.text('0'), nullable=False),
        sa.Column('last_error', sa.Text(), nullable=True),
        sa.Column('run_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='SET NULL', name=op.f('fk_background_jobs_organization_id_organizations')),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_background_jobs')),
    )
    op.create_index(op.f('ix_background_jobs_organization_id'), 'background_jobs', ['organization_id'], unique=False)
    op.create_index(op.f('ix_background_jobs_status'), 'background_jobs', ['status'], unique=False)
    op.create_index(op.f('ix_background_jobs_run_at'), 'background_jobs', ['run_at'], unique=False)

    op.create_table(
        'job_locks',
        sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('lock_key', sa.String(length=200), nullable=False),
        sa.Column('owner', sa.String(length=120), nullable=True),
        sa.Column('lock_metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('acquired_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_job_locks')),
        sa.UniqueConstraint('lock_key', name=op.f('uq_job_locks_lock_key')),
    )
    op.create_index(op.f('ix_job_locks_expires_at'), 'job_locks', ['expires_at'], unique=False)

    op.create_table(
        'websocket_sessions',
        sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('organization_id', sa.UUID(), nullable=True),
        sa.Column('user_id', sa.UUID(), nullable=True),
        sa.Column('connection_id', sa.String(length=200), nullable=True),
        sa.Column('socket_metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('connected_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('disconnected_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='SET NULL', name=op.f('fk_websocket_sessions_organization_id_organizations')),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL', name=op.f('fk_websocket_sessions_user_id_users')),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_websocket_sessions')),
    )
    op.create_index(op.f('ix_websocket_sessions_organization_id'), 'websocket_sessions', ['organization_id'], unique=False)
    op.create_index(op.f('ix_websocket_sessions_user_id'), 'websocket_sessions', ['user_id'], unique=False)
    op.create_index(op.f('ix_websocket_sessions_connected_at'), 'websocket_sessions', ['connected_at'], unique=False)

    op.create_table(
        'export_jobs',
        sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('organization_id', sa.UUID(), nullable=False),
        sa.Column('export_type', sa.String(length=80), nullable=False),
        sa.Column('status', sa.String(length=40), nullable=False),
        sa.Column('filters', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('file_url', sa.Text(), nullable=True),
        sa.Column('requested_by', sa.UUID(), nullable=True),
        sa.Column('requested_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE', name=op.f('fk_export_jobs_organization_id_organizations')),
        sa.ForeignKeyConstraint(['requested_by'], ['users.id'], name=op.f('fk_export_jobs_requested_by_users')),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_export_jobs')),
    )
    op.create_index(op.f('ix_export_jobs_organization_id'), 'export_jobs', ['organization_id'], unique=False)
    op.create_index(op.f('ix_export_jobs_status'), 'export_jobs', ['status'], unique=False)
    op.create_index(op.f('ix_export_jobs_requested_at'), 'export_jobs', ['requested_at'], unique=False)

    # Add missing foreign-key indexes on existing tables
    op.create_index(op.f('ix_users_organization_id'), 'users', ['organization_id'], unique=False)
    op.create_index(op.f('ix_campaigns_organization_id'), 'campaigns', ['organization_id'], unique=False)
    op.create_index(op.f('ix_leads_organization_id'), 'leads', ['organization_id'], unique=False)
    op.create_index(op.f('ix_templates_organization_id'), 'templates', ['organization_id'], unique=False)
    op.create_index(op.f('ix_campaign_targets_template_id'), 'campaign_targets', ['template_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_campaign_targets_template_id'), table_name='campaign_targets')
    op.drop_index(op.f('ix_templates_organization_id'), table_name='templates')
    op.drop_index(op.f('ix_leads_organization_id'), table_name='leads')
    op.drop_index(op.f('ix_campaigns_organization_id'), table_name='campaigns')
    op.drop_index(op.f('ix_users_organization_id'), table_name='users')

    op.drop_index(op.f('ix_export_jobs_requested_at'), table_name='export_jobs')
    op.drop_index(op.f('ix_export_jobs_status'), table_name='export_jobs')
    op.drop_index(op.f('ix_export_jobs_organization_id'), table_name='export_jobs')
    op.drop_table('export_jobs')

    op.drop_index(op.f('ix_websocket_sessions_connected_at'), table_name='websocket_sessions')
    op.drop_index(op.f('ix_websocket_sessions_user_id'), table_name='websocket_sessions')
    op.drop_index(op.f('ix_websocket_sessions_organization_id'), table_name='websocket_sessions')
    op.drop_table('websocket_sessions')

    op.drop_index(op.f('ix_job_locks_expires_at'), table_name='job_locks')
    op.drop_table('job_locks')

    op.drop_index(op.f('ix_background_jobs_run_at'), table_name='background_jobs')
    op.drop_index(op.f('ix_background_jobs_status'), table_name='background_jobs')
    op.drop_index(op.f('ix_background_jobs_organization_id'), table_name='background_jobs')
    op.drop_table('background_jobs')

    op.drop_index(op.f('ix_api_usage_created_at'), table_name='api_usage')
    op.drop_index(op.f('ix_api_usage_api_key_id'), table_name='api_usage')
    op.drop_index(op.f('ix_api_usage_organization_id'), table_name='api_usage')
    op.drop_table('api_usage')

    op.drop_index(op.f('ix_integration_health_checks_checked_at'), table_name='integration_health_checks')
    op.drop_index(op.f('ix_integration_health_checks_integration_id'), table_name='integration_health_checks')
    op.drop_table('integration_health_checks')

    op.drop_index(op.f('ix_webhook_deliveries_created_at'), table_name='webhook_deliveries')
    op.drop_index(op.f('ix_webhook_deliveries_webhook_id'), table_name='webhook_deliveries')
    op.drop_table('webhook_deliveries')

    op.drop_index(op.f('ix_webhooks_provider'), table_name='webhooks')
    op.drop_index(op.f('ix_webhooks_organization_id'), table_name='webhooks')
    op.drop_table('webhooks')

    op.drop_index(op.f('ix_integrations_organization_id'), table_name='integrations')
    op.drop_table('integrations')

    op.drop_index(op.f('ix_campaign_roi_organization_id'), table_name='campaign_roi')
    op.drop_table('campaign_roi')

    op.drop_index(op.f('ix_analytics_timeseries_org_metric_period'), table_name='analytics_timeseries')
    op.drop_table('analytics_timeseries')

    op.drop_index(op.f('ix_compliance_reports_created_at'), table_name='compliance_reports')
    op.drop_index(op.f('ix_compliance_reports_report_type'), table_name='compliance_reports')
    op.drop_index(op.f('ix_compliance_reports_organization_id'), table_name='compliance_reports')
    op.drop_table('compliance_reports')

    op.drop_index(op.f('ix_compliance_events_created_at'), table_name='compliance_events')
    op.drop_index(op.f('ix_compliance_events_phone_number'), table_name='compliance_events')
    op.drop_index(op.f('ix_compliance_events_organization_id'), table_name='compliance_events')
    op.drop_table('compliance_events')

    op.drop_index(op.f('ix_phone_number_metrics_daily_metric_date'), table_name='phone_number_metrics_daily')
    op.drop_index(op.f('ix_phone_number_metrics_daily_organization_id'), table_name='phone_number_metrics_daily')
    op.drop_table('phone_number_metrics_daily')

    op.drop_index(op.f('ix_phone_number_assignments_campaign_id'), table_name='phone_number_assignments')
    op.drop_index(op.f('ix_phone_number_assignments_phone_number_id'), table_name='phone_number_assignments')
    op.drop_table('phone_number_assignments')

    op.drop_index(op.f('ix_template_metrics_daily_metric_date'), table_name='template_metrics_daily')
    op.drop_index(op.f('ix_template_metrics_daily_organization_id'), table_name='template_metrics_daily')
    op.drop_table('template_metrics_daily')

    op.drop_index(op.f('ix_campaign_events_created_at'), table_name='campaign_events')
    op.drop_index(op.f('ix_campaign_events_campaign_id'), table_name='campaign_events')
    op.drop_table('campaign_events')

    op.drop_index(op.f('ix_campaign_metrics_daily_metric_date'), table_name='campaign_metrics_daily')
    op.drop_index(op.f('ix_campaign_metrics_daily_organization_id'), table_name='campaign_metrics_daily')
    op.drop_table('campaign_metrics_daily')

    op.drop_index(op.f('ix_campaign_audiences_campaign_id'), table_name='campaign_audiences')
    op.drop_table('campaign_audiences')

    op.drop_index(op.f('ix_campaign_schedules_campaign_id'), table_name='campaign_schedules')
    op.drop_table('campaign_schedules')

    op.drop_index(op.f('ix_lead_tags_tag_id'), table_name='lead_tags')
    op.drop_table('lead_tags')

    op.drop_index(op.f('ix_tags_organization_id'), table_name='tags')
    op.drop_table('tags')

    op.drop_index(op.f('ix_lead_import_rows_row_number'), table_name='lead_import_rows')
    op.drop_index(op.f('ix_lead_import_rows_status'), table_name='lead_import_rows')
    op.drop_index(op.f('ix_lead_import_rows_import_id'), table_name='lead_import_rows')
    op.drop_table('lead_import_rows')

    op.drop_index(op.f('ix_lead_imports_created_at'), table_name='lead_imports')
    op.drop_index(op.f('ix_lead_imports_status'), table_name='lead_imports')
    op.drop_index(op.f('ix_lead_imports_organization_id'), table_name='lead_imports')
    op.drop_table('lead_imports')

    op.drop_index(op.f('ix_user_sessions_expires_at'), table_name='user_sessions')
    op.drop_index(op.f('ix_user_sessions_organization_id'), table_name='user_sessions')
    op.drop_index(op.f('ix_user_sessions_user_id'), table_name='user_sessions')
    op.drop_table('user_sessions')

    op.drop_index(op.f('ix_api_keys_created_by'), table_name='api_keys')
    op.drop_index(op.f('ix_api_keys_organization_id'), table_name='api_keys')
    op.drop_table('api_keys')

    op.drop_index(op.f('ix_user_roles_role_id'), table_name='user_roles')
    op.drop_table('user_roles')

    op.drop_index(op.f('ix_role_permissions_permission_id'), table_name='role_permissions')
    op.drop_table('role_permissions')

    op.drop_index(op.f('ix_permissions_id'), table_name='permissions')
    op.drop_table('permissions')

    op.drop_index(op.f('ix_roles_id'), table_name='roles')
    op.drop_table('roles')
