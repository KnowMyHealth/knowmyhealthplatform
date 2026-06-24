"""add_patient_note_to_consultations

Revision ID: a1b2c3d4e5f6
Revises: ef40c69ddf1f
Create Date: 2026-06-24 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = 'ef40c69ddf1f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('consultations', sa.Column('patient_note', sa.String(500), nullable=True))


def downgrade() -> None:
    op.drop_column('consultations', 'patient_note')
