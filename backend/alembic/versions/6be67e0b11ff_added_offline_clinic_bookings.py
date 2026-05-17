"""Added offline clinic bookings

Revision ID: 6be67e0b11ff
Revises: 1d8c8352e50f
Create Date: 2026-05-17 18:05:27.800326

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql # <-- Required for PG ENUMs

# revision identifiers, used by Alembic.
revision: str = '6be67e0b11ff'
down_revision: Union[str, Sequence[str], None] = '1d8c8352e50f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create the ENUM type in PostgreSQL
    consultation_type = postgresql.ENUM('ONLINE', 'OFFLINE', name='consultationtype')
    consultation_type.create(op.get_bind())

    # 2. Add column to consultations with a server_default to handle existing rows
    op.add_column('consultations', sa.Column('consultation_type', sa.Enum('ONLINE', 'OFFLINE', name='consultationtype'), server_default='ONLINE', nullable=False))
    
    # 3. Make channel_name nullable (since Offline visits won't have one)
    op.alter_column('consultations', 'channel_name',
               existing_type=sa.VARCHAR(length=255),
               nullable=True)
    
    # 4. Add columns to doctors table with defaults
    op.add_column('doctors', sa.Column('offline_consultation_enabled', sa.Boolean(), server_default='false', nullable=False))
    op.add_column('doctors', sa.Column('clinic_address', sa.Text(), nullable=True))


def downgrade() -> None:
    # 1. Remove columns from doctors
    op.drop_column('doctors', 'clinic_address')
    op.drop_column('doctors', 'offline_consultation_enabled')
    
    # 2. Revert channel_name to NOT NULL
    op.alter_column('consultations', 'channel_name',
               existing_type=sa.VARCHAR(length=255),
               nullable=False)
    
    # 3. Drop the consultation_type column
    op.drop_column('consultations', 'consultation_type')

    # 4. Drop the ENUM type from PostgreSQL
    consultation_type = postgresql.ENUM('ONLINE', 'OFFLINE', name='consultationtype')
    consultation_type.drop(op.get_bind())