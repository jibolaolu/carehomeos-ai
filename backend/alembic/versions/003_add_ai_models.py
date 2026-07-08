"""Add AI feedback, CQC snapshots, pattern reports, and predictive risk scores

Revision ID: 003
Revises: 002
Create Date: 2026-06-27 18:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '003'
down_revision: Union[str, None] = '002'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── AIFeedback ──
    op.create_table(
        'ai_feedback',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('care_home_id', sa.String(36), sa.ForeignKey('care_homes.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('resident_id', sa.String(36), sa.ForeignKey('residents.id', ondelete='SET NULL'), nullable=True, index=True),
        sa.Column('staff_user_id', sa.String(36), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=False, index=True),
        sa.Column('source_type', sa.String(50), nullable=False),
        sa.Column('source_id', sa.String(36), nullable=True, index=True),
        sa.Column('ai_model', sa.String(100), nullable=False),
        sa.Column('ai_provider', sa.String(50), nullable=False),
        sa.Column('fallback_used', sa.Boolean, default=False, nullable=False),
        sa.Column('rating', sa.Integer, nullable=True),
        sa.Column('was_edited', sa.Boolean, default=False, nullable=False),
        sa.Column('edit_reason', sa.Text, nullable=True),
        sa.Column('original_content', sa.Text, nullable=True),
        sa.Column('corrected_content', sa.Text, nullable=True),
        sa.Column('correction_summary', sa.String(500), nullable=True),
        sa.Column('clinical_safety_concern', sa.Boolean, default=False, nullable=False),
        sa.Column('safety_concern_details', sa.Text, nullable=True),
        sa.Column('incorporated_into_training', sa.Boolean, default=False, nullable=False),
        sa.Column('incorporated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
    )

    # ── CQCSnapshot ──
    op.create_table(
        'cqc_snapshots',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('care_home_id', sa.String(36), sa.ForeignKey('care_homes.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('snapshot_date', sa.Date, nullable=False, index=True),
        sa.Column('week_ending', sa.Date, nullable=False, index=True),
        sa.Column('overall_readiness_score', sa.Float, nullable=False, default=0.0),
        sa.Column('estimated_rating', sa.String(20), nullable=True),
        sa.Column('rating_confidence', sa.String(20), nullable=True),
        sa.Column('safe_score', sa.Float, nullable=False, default=0.0),
        sa.Column('effective_score', sa.Float, nullable=False, default=0.0),
        sa.Column('caring_score', sa.Float, nullable=False, default=0.0),
        sa.Column('responsive_score', sa.Float, nullable=False, default=0.0),
        sa.Column('well_led_score', sa.Float, nullable=False, default=0.0),
        sa.Column('qs_with_evidence', sa.Integer, nullable=False, default=0),
        sa.Column('qs_total', sa.Integer, nullable=False, default=34),
        sa.Column('evidence_summary', sa.Text, nullable=True),
        sa.Column('gaps_identified', sa.Text, nullable=True),
        sa.Column('recommended_actions', sa.Text, nullable=True),
        sa.Column('ai_model', sa.String(100), nullable=True),
        sa.Column('ai_provider', sa.String(50), nullable=True),
        sa.Column('fallback_used', sa.Boolean, default=False, nullable=False),
        sa.Column('generation_time_ms', sa.Integer, nullable=True),
        sa.Column('alert_triggered', sa.Boolean, default=False, nullable=False),
        sa.Column('alert_details', sa.Text, nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
    )

    # ── PatternReport ──
    op.create_table(
        'pattern_reports',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('care_home_id', sa.String(36), sa.ForeignKey('care_homes.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('resident_id', sa.String(36), sa.ForeignKey('residents.id', ondelete='SET NULL'), nullable=True, index=True),
        sa.Column('report_type', sa.String(50), nullable=False),
        sa.Column('analysis_period_start', sa.Date, nullable=False),
        sa.Column('analysis_period_end', sa.Date, nullable=False),
        sa.Column('pattern_detected', sa.Boolean, default=False, nullable=False),
        sa.Column('pattern_description', sa.Text, nullable=True),
        sa.Column('confidence_score', sa.Float, nullable=True),
        sa.Column('severity', sa.String(20), nullable=True),
        sa.Column('evidence_ids', sa.Text, nullable=True),
        sa.Column('evidence_summary', sa.Text, nullable=True),
        sa.Column('recommended_actions', sa.Text, nullable=True),
        sa.Column('assigned_to_user_id', sa.String(36), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('action_deadline', sa.Date, nullable=True),
        sa.Column('action_completed', sa.Boolean, default=False, nullable=False),
        sa.Column('action_completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('safeguarding_alert_id', sa.String(36), sa.ForeignKey('safeguarding_alerts.id', ondelete='SET NULL'), nullable=True),
        sa.Column('risk_pattern_id', sa.String(36), sa.ForeignKey('risk_patterns.id', ondelete='SET NULL'), nullable=True),
        sa.Column('ai_model', sa.String(100), nullable=True),
        sa.Column('ai_provider', sa.String(50), nullable=True),
        sa.Column('fallback_used', sa.Boolean, default=False, nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
    )

    # ── PredictiveRiskScore ──
    op.create_table(
        'predictive_risk_scores',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('care_home_id', sa.String(36), sa.ForeignKey('care_homes.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('resident_id', sa.String(36), sa.ForeignKey('residents.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('prediction_date', sa.Date, nullable=False, index=True),
        sa.Column('prediction_horizon_days', sa.Integer, nullable=False, default=30),
        sa.Column('falls_risk_score', sa.Float, nullable=True),
        sa.Column('deterioration_risk_score', sa.Float, nullable=True),
        sa.Column('hospitalisation_risk_score', sa.Float, nullable=True),
        sa.Column('dehydration_risk_score', sa.Float, nullable=True),
        sa.Column('malnutrition_risk_score', sa.Float, nullable=True),
        sa.Column('pressure_ulcer_risk_score', sa.Float, nullable=True),
        sa.Column('uti_risk_score', sa.Float, nullable=True),
        sa.Column('social_isolation_risk_score', sa.Float, nullable=True),
        sa.Column('overall_risk_score', sa.Float, nullable=True),
        sa.Column('overall_risk_level', sa.String(20), nullable=True),
        sa.Column('contributing_factors', sa.Text, nullable=True),
        sa.Column('protective_factors', sa.Text, nullable=True),
        sa.Column('recommended_interventions', sa.Text, nullable=True),
        sa.Column('care_plan_updates_suggested', sa.Text, nullable=True),
        sa.Column('actual_outcome', sa.String(50), nullable=True),
        sa.Column('outcome_date', sa.Date, nullable=True),
        sa.Column('outcome_notes', sa.Text, nullable=True),
        sa.Column('prediction_accuracy', sa.Float, nullable=True),
        sa.Column('ai_model', sa.String(100), nullable=True),
        sa.Column('ai_provider', sa.String(50), nullable=True),
        sa.Column('fallback_used', sa.Boolean, default=False, nullable=False),
        sa.Column('features_used', sa.Text, nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table('predictive_risk_scores')
    op.drop_table('pattern_reports')
    op.drop_table('cqc_snapshots')
    op.drop_table('ai_feedback')
