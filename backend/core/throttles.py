"""Rate limits for public endpoints (guide Step 7: contact form)."""

from rest_framework.throttling import AnonRateThrottle


class ContactRateThrottle(AnonRateThrottle):
    """Limit contact-form submissions per IP address.

    The rate comes from REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"]["contact"],
    which reads CONTACT_RATE_LIMIT from the environment (default 5/hour).
    """

    scope = "contact"
