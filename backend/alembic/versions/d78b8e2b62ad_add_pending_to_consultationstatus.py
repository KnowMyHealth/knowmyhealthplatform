"""add_pending_to_consultationstatus

Revision ID: d78b8e2b62ad
Revises: 62c5522076da
Create Date: 2026-05-28 10:55:26.311429

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd78b8e2b62ad'
down_revision: Union[str, Sequence[str], None] = '62c5522076da'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Use autocommit block because Postgres prevents ALTER TYPE inside transactions
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE consultationstatus ADD VALUE IF NOT EXISTS 'PENDING' BEFORE 'SCHEDULED';")

def downgrade() -> None:
    pass