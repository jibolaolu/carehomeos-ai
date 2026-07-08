"""Add SafeguardingOS tables

Revision ID: 002
Revises: 001
Create Date: 2026-06-08 01:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '002'
down_revision: Union[str, None] = '001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'safeguarding_cases',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('care_home_id', sa.String(36), sa.ForeignKey('care_homes.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('resident_id', sa.String(36), sa.ForeignKey('residents.id', ondelete='SET NULL'), nullable=True, index=True),
        sa.Column('reference', sa.String(100), nullable=False, unique=True, index=True),
        sa.Column('status', sa.String(50), default='open', nullable=False),
        sa.Column('risk_level', sa.String(20), nullable=True),
        sa.Column('opened_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('opened_by_user_id', sa.String(36), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=False),
        sa.Column('assigned_to_user_id', sa.String(36), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('closed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('closed_by_user_id', sa.String(36), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('closure_summary', sa.Text, nullable=True),
        sa.Column('referral_made', sa.Boolean, default=False, nullable=False),
        sa.Column('referral_authority', sa.String(255), nullable=True),
        sa.Column('referral_reference', sa.String(255), nullable=True),
        sa.Column('referral_made_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('review_due_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
    )

    op.create_table(
        'safeguarding_alerts',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('care_home_id', sa.String(36), sa.ForeignKey('care_homes.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('resident_id', sa.String(36), sa.ForeignKey('residents.id', ondelete='SET NULL'), nullable=True, index=True),
        sa.Column('incident_id', sa.String(36), sa.ForeignKey('incidents.id', ondelete='SET NULL'), nullable=True, index=True),
        sa.Column('care_note_id', sa.String(36), sa.ForeignKey('care_notes.id', ondelete='SET NULL'), nullable=True, index=True),
        sa.Column('source_type', sa.String(50), nullable=False),
        sa.Column('source_id', sa.String(36), nullable=True),
        sa.Column('category', sa.String(100), nullable=False),
        sa.Column('severity', sa.String(20), default='medium', nullable=False),
        sa.Column('status', sa.String(20), default='open', nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('description', sa.Text, nullable=False),
        sa.Column('evidence_summary', sa.Text, nullable=True),
        sa.Column('triggered_by_user_id', sa.String(36), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('acknowledged_by_user_id', sa.String(36), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('acknowledged_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('closed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('closed_reason', sa.Text, nullable=True),
        sa.Column('safeguarding_case_id', sa.String(36), sa.ForeignKey('safeguarding_cases.id', ondelete='SET NULL'), nullable=True, index=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
    )

    op.create_table(
        'section42_enquiries',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('care_home_id', sa.String(36), sa.ForeignKey('care_homes.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('safeguarding_case_id', sa.String(36), sa.ForeignKey('safeguarding_cases.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('resident_id', sa.String(36), sa.ForeignKey('residents.id', ondelete='SET NULL'), nullable=True, index=True),
        sa.Column('reference', sa.String(100), nullable=False, unique=True, index=True),
        sa.Column('status', sa.String(50), default='draft', nullable=False),
        sa.Column('generated_by_user_id', sa.String(36), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=False),
        sa.Column('generated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('submitted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('concluded_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('conclusion_outcome', sa.String(255), nullable=True),
        sa.Column('summary', sa.Text, nullable=True),
        sa.Column('risks', sa.Text, nullable=True),
        sa.Column('evidence', sa.Text, nullable=True),
        sa.Column('capacity_considerations', sa.Text, nullable=True),
        sa.Column('recommended_outcomes', sa.Text, nullable=True),
        sa.Column('narrative', sa.Text, nullable=True),
        sa.Column('model_provider', sa.String(100), nullable=True),
        sa.Column('model_name', sa.String(100), nullable=True),
        sa.Column('fallback_used', sa.Boolean, default=False, nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
    )

    op.create_table(
        'pattern_signals',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('care_home_id', sa.String(36), sa.ForeignKey('care_homes.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('resident_id', sa.String(36), sa.ForeignKey('residents.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('source_type', sa.String(50), nullable=False),
        sa.Column('source_id', sa.String(36), nullable=False),
        sa.Column('signal_type', sa.String(100), nullable=False),
        sa.Column('detected_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('evidence_text', sa.Text, nullable=True),
        sa.Column('confidence', sa.Float, default=0.0, nullable=False),
        sa.Column('risk_weight', sa.Integer, default=1, nullable=False),
        sa.Column('contributing_data', sa.Text, nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
    )

    op.create_table(
        'risk_patterns',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('care_home_id', sa.String(36), sa.ForeignKey('care_homes.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('resident_id', sa.String(36), sa.ForeignKey('residents.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('safeguarding_case_id', sa.String(36), sa.ForeignKey('safeguarding_cases.id', ondelete='SET NULL'), nullable=True, index=True),
        sa.Column('pattern_type', sa.String(100), nullable=False),
        sa.Column('category', sa.String(100), nullable=False),
        sa.Column('severity', sa.String(20), default='medium', nullable=False),
        sa.Column('confidence', sa.Float, default=0.0, nullable=False),
        sa.Column('time_window_days', sa.Integer, default=30, nullable=False),
        sa.Column('window_start', sa.DateTime(timezone=True), nullable=False),
        sa.Column('window_end', sa.DateTime(timezone=True), nullable=False),
        sa.Column('summary', sa.Text, nullable=False),
        sa.Column('contributing_evidence', sa.Text, nullable=True),
        sa.Column('recommended_actions', sa.Text, nullable=True),
        sa.Column('model_provider', sa.String(100), nullable=True),
        sa.Column('model_name', sa.String(100), nullable=True),
        sa.Column('fallback_used', sa.Boolean, default=False, nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
    )

    op.create_table(
        'evidence_packs',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('care_home_id', sa.String(36), sa.ForeignKey('care_homes.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('safeguarding_case_id', sa.String(36), sa.ForeignKey('safeguarding_cases.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('resident_id', sa.String(36), sa.ForeignKey('residents.id', ondelete='SET NULL'), nullable=True, index=True),
        sa.Column('reference', sa.String(100), nullable=False, unique=True, index=True),
        sa.Column('status', sa.String(50), default='pending', nullable=False),
        sa.Column('pack_type', sa.String(100), nullable=False),
        sa.Column('date_from', sa.DateTime(timezone=True), nullable=False),
        sa.Column('date_to', sa.DateTime(timezone=True), nullable=False),
        sa.Column('include_incidents', sa.Boolean, default=True, nullable=False),
        sa.Column('include_care_notes', sa.Boolean, default=True, nullable=False),
        sa.Column('include_section42', sa.Boolean, default=True, nullable=False),
        sa.Column('include_alerts', sa.Boolean, default=True, nullable=False),
        sa.Column('include_patterns', sa.Boolean, default=True, nullable=False),
        sa.Column('generated_by_user_id', sa.String(36), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=False),
        sa.Column('generated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('s3_bucket', sa.String(255), nullable=True),
        sa.Column('s3_key_pdf', sa.String(500), nullable=True),
        sa.Column('s3_key_zip', sa.String(500), nullable=True),
        sa.Column('file_size_bytes', sa.Integer, nullable=True),
        sa.Column('error_message', sa.Text, nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
    )

    op.create_table(
        'evidence_pack_items',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('evidence_pack_id', sa.String(36), sa.ForeignKey('evidence_packs.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('item_type', sa.String(50), nullable=False),
        sa.Column('source_id', sa.String(36), nullable=False),
        sa.Column('source_reference', sa.String(255), nullable=True),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('occurred_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('content_summary', sa.Text, nullable=True),
        sa.Column('included_in_pdf', sa.Boolean, default=True, nullable=False),
        sa.Column('included_in_zip', sa.Boolean, default=True, nullable=False),
        sa.Column('sort_order', sa.Integer, default=0, nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table('evidence_pack_items')
    op.drop_table('evidence_packs')
    op.drop_table('risk_patterns')
    op.drop_table('pattern_signals')
    op.drop_table('section42_enquiries')
    op.drop_table('safeguarding_alerts')
    op.drop_table('safeguarding_cases')
