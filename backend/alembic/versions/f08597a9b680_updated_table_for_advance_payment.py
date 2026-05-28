"""updated table for advance payment

Revision ID: f08597a9b680
Revises: d78b8e2b62ad
Create Date: 2026-05-28 18:37:45.674706

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'f08597a9b680'
down_revision: Union[str, Sequence[str], None] = 'd78b8e2b62ad'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create the new PaymentMode ENUM type explicitly in Postgres
    payment_mode_enum = postgresql.ENUM('FULL', 'ADVANCE', name='paymentmode')
    payment_mode_enum.create(op.get_bind())

    # 2. Add the column to the payments table with a server_default (stops crashes on existing rows)
    op.add_column(
        'payments', 
        sa.Column('payment_mode', sa.Enum('FULL', 'ADVANCE', name='paymentmode'), nullable=False, server_default='FULL')
    )

    # 3. Inject the 'ADVANCE_PAID' value into existing booking ENUM types
    op.execute("ALTER TYPE labtestbookingstatus ADD VALUE IF NOT EXISTS 'ADVANCE_PAID'")
    op.execute("ALTER TYPE healthpackagebookingstatus ADD VALUE IF NOT EXISTS 'ADVANCE_PAID'")


def downgrade() -> None:
    # 1. Drop the payment_mode column
    op.drop_column('payments', 'payment_mode')

    # 2. Drop the PaymentMode ENUM type
    op.execute("DROP TYPE paymentmode")
    
    # NOTE: PostgreSQL does not natively support dropping a single value from an ENUM type.
    # Therefore, we leave 'ADVANCE_PAID' inside the other booking enums.
    pass