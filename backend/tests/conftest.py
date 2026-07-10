import pytest

from app.core.rate_limit import clear_rate_limit_state


@pytest.fixture(autouse=True)
def reset_rate_limit_state():
    clear_rate_limit_state()
    yield
    clear_rate_limit_state()
