import asyncio
import csv
import os
from datetime import time
from sqlalchemy import select
from app.db.session import AsyncSessionFactory
from app.db import all_models 
from app.modules.labtest.models import LabTestCategory, LabTest, LabTestAvailability

# Ensure these files are in the same folder as this script
FILES_TO_PROCESS = ['Radiology.csv', 'Laboratory.csv']

def parse_time_str(time_str: str) -> time | None:
    """Converts '7:00 Hrs' or '22:00' to a Python time object."""
    if not time_str or time_str.strip() == '':
        return None
    try:
        clean_str = time_str.lower().replace('hrs', '').replace('hr', '').strip()
        parts = clean_str.split(':')
        if len(parts) >= 2:
            return time(int(parts[0].strip()), int(parts[1].strip()))
    except Exception as e:
        print(f"  [!] Could not parse time: {time_str}")
    return None

def parse_time_range(range_str: str):
    """Converts '11:00 - 16:00 Hrs' into two time objects (start, end)."""
    if not range_str or range_str.strip() == '':
        return None, None
    try:
        clean_str = range_str.lower().replace('hrs', '').replace('hr', '').strip()
        start_str, end_str = clean_str.split('-')
        return parse_time_str(start_str), parse_time_str(end_str)
    except Exception:
        return None, None

async def seed_data():
    async with AsyncSessionFactory() as db:
        print("🚀 Starting Lab Test Seeding Process...")

        # Cache categories to avoid hitting the DB repeatedly
        categories_cache = {}

        for file_name in FILES_TO_PROCESS:
            if not os.path.exists(file_name):
                print(f"❌ File not found: {file_name}. Skipping.")
                continue

            print(f"\n📂 Processing {file_name}...")
            
            with open(file_name, mode='r', encoding='utf-8') as file:
                reader = csv.DictReader(file)
                
                # Normalize headers to lowercase to handle "Block Time" vs "Block time"
                reader.fieldnames = [name.strip().lower() if name else '' for name in reader.fieldnames]

                success_count = 0
                skip_count = 0

                for row_num, row in enumerate(reader, start=2):
                    # Map normalized row keys safely
                    cat_name = row.get('category name', '').strip()
                    test_name = row.get('lab test name', '').strip()
                    org_name = row.get('lab / organization', '').strip()
                    
                    # Skip empty rows (like the ones at the bottom of Laboratory.csv)
                    if not test_name or not cat_name or not org_name:
                        continue

                    # 1. Get or Create Category
                    if cat_name not in categories_cache:
                        cat_stmt = select(LabTestCategory).where(LabTestCategory.name == cat_name)
                        category = (await db.execute(cat_stmt)).scalar_one_or_none()
                        
                        if not category:
                            category = LabTestCategory(name=cat_name, description=f"{cat_name} tests")
                            db.add(category)
                            await db.commit()
                            await db.refresh(category)
                            print(f"  📁 Created Category: {cat_name}")
                        
                        categories_cache[cat_name] = category.id

                    cat_id = categories_cache[cat_name]

                    # 2. Check if Test already exists
                    test_stmt = select(LabTest).where(LabTest.name == test_name, LabTest.organization == org_name)
                    existing_test = (await db.execute(test_stmt)).scalar_one_or_none()

                    if existing_test:
                        skip_count += 1
                        continue

                    # 3. Parse numerical values securely
                    try:
                        price_str = row.get('base price', '').replace(',', '').strip()
                        price = float(price_str) if price_str else 0.0
                        
                        discount_str = row.get('discount', '').replace('%', '').strip()
                        discount = float(discount_str) if discount_str else 0.0
                        
                        turnaround_str = row.get('turnaround time', '').lower().replace('hrs', '').replace('hr', '').strip()
                        turnaround = int(turnaround_str) if turnaround_str else 24
                    except ValueError:
                        print(f"  [!] Invalid numbers at row {row_num} for test '{test_name}'. Skipping.")
                        continue

                    open_time = parse_time_str(row.get('open time', ''))
                    close_time = parse_time_str(row.get('closing time', ''))
                    address = row.get('clinic address', '').strip()

                    # 4. Create the Lab Test
                    new_test = LabTest(
                        category_id=cat_id,
                        name=test_name,
                        organization=org_name,
                        results_in=turnaround,
                        price=price,
                        discount_percentage=discount,
                        is_active=True,
                        clinic_address=address if address else None,
                        clinic_open_time=open_time,
                        clinic_close_time=close_time
                    )
                    db.add(new_test)
                    await db.flush() # Flush to get new_test.id for the availability rows

                    # 5. Generate Availability Schedule
                    block_start, block_end = parse_time_range(row.get('block time', ''))
                    sun_start, sun_end = parse_time_range(row.get('sunday hours', ''))

                    availabilities = []

                    # Monday to Saturday (0 to 5)
                    for day in range(6):
                        if open_time and close_time:
                            if block_start and block_end:
                                # Split shift (Morning: Open -> Block Start)
                                availabilities.append(LabTestAvailability(
                                    lab_test_id=new_test.id, day_of_week=day,
                                    start_time=open_time, end_time=block_start
                                ))
                                # Split shift (Evening: Block End -> Close)
                                availabilities.append(LabTestAvailability(
                                    lab_test_id=new_test.id, day_of_week=day,
                                    start_time=block_end, end_time=close_time
                                ))
                            else:
                                # Continuous shift
                                availabilities.append(LabTestAvailability(
                                    lab_test_id=new_test.id, day_of_week=day,
                                    start_time=open_time, end_time=close_time
                                ))

                    # Sunday (6)
                    if sun_start and sun_end:
                        availabilities.append(LabTestAvailability(
                            lab_test_id=new_test.id, day_of_week=6,
                            start_time=sun_start, end_time=sun_end
                        ))

                    db.add_all(availabilities)
                    success_count += 1

                # Commit all tests for this file
                await db.commit()
                print(f"  ✅ Finished {file_name}: Inserted {success_count} tests (Skipped {skip_count} duplicates).")

        print("\n🎉 Seeding Complete!")

if __name__ == "__main__":
    # Windows specific fix for asyncio event loops
    import sys
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
        
    asyncio.run(seed_data())