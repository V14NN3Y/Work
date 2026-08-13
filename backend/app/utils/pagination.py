DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 100


def clamp_page_size(page_size: int) -> int:
    return max(1, min(page_size, MAX_PAGE_SIZE))


def offset_for(page: int, page_size: int) -> int:
    return max(0, page - 1) * page_size
