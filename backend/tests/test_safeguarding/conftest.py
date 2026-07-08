from __future__ import annotations

import uuid
from collections.abc import AsyncGenerator
from datetime import date

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.db import Base, get_db
from app.main import app
from app.models.care_home import CareHome
from app.models.incident import Incident
from app.models.resident import Resident
from app.models.safeguarding import SafeguardingCase
from app.models.user import User

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

engine = create_async_engine(TEST_DATABASE_URL, future=True, echo=False)
TestingSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False, autocommit=False, autoflush=False)


@pytest_asyncio.fixture(scope="session", autouse=True)
async def setup_db() -> AsyncGenerator[None, None]:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    async with TestingSessionLocal() as session:
        yield session


@pytest_asyncio.fixture
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def test_care_home(db_session: AsyncSession) -> CareHome:
    home = CareHome(
        id=str(uuid.uuid4()),
        name="Test Care Home",
        address_line_1="1 Test Street",
        city="Testville",
        postcode="TE1 1ST",
        phone="01234567890",
        email="test@example.com",
        nation="england",
    )
    db_session.add(home)
    await db_session.flush()
    return home


@pytest_asyncio.fixture
async def test_user(db_session: AsyncSession, test_care_home: CareHome) -> User:
    user = User(
        id="local-manager",
        email="manager@oakfield.local",
        first_name="Local",
        last_name="Manager",
        role="care_home_admin",
        care_home_id=test_care_home.id,
    )
    db_session.add(user)
    await db_session.flush()
    return user


@pytest_asyncio.fixture
async def test_resident(db_session: AsyncSession, test_care_home: CareHome) -> Resident:
    resident = Resident(
        id=str(uuid.uuid4()),
        care_home_id=test_care_home.id,
        first_name="Alice",
        last_name="Test",
        date_of_birth=date(1940, 1, 1),
        gender="female",
        room="101",
        admission_date=date(2020, 1, 1),
        primary_need="Personal care",
    )
    db_session.add(resident)
    await db_session.flush()
    return resident


@pytest_asyncio.fixture
async def test_case(db_session: AsyncSession, test_care_home: CareHome, test_resident: Resident, test_user: User) -> SafeguardingCase:
    case = SafeguardingCase(
        id=str(uuid.uuid4()),
        care_home_id=test_care_home.id,
        resident_id=test_resident.id,
        reference="SG-20260101-TEST01",
        status="open",
        opened_by_user_id=test_user.id,
    )
    db_session.add(case)
    await db_session.flush()
    return case
