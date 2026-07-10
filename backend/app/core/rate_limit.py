from collections import defaultdict, deque
from time import monotonic


class RateLimitExceededError(Exception):
    pass


_attempts: dict[str, deque[float]] = defaultdict(deque)


def check_rate_limit(*, key: str, limit: int, window_seconds: int) -> None:
    now = monotonic()
    bucket = _attempts[key]
    while bucket and now - bucket[0] >= window_seconds:
        bucket.popleft()

    if len(bucket) >= limit:
        raise RateLimitExceededError

    bucket.append(now)


def clear_rate_limit_state() -> None:
    _attempts.clear()
