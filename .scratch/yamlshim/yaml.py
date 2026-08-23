import json


class YAMLError(Exception):
    pass


def safe_load(text):
    if text is None:
        return None
    if isinstance(text, bytes):
        text = text.decode("utf-8")
    if not isinstance(text, str):
        raise YAMLError("expected text input")
    stripped = text.strip()
    if not stripped:
        return {}
    if stripped.startswith("{") or stripped.startswith("["):
        try:
            return json.loads(stripped)
        except json.JSONDecodeError as exc:
            raise YAMLError(str(exc)) from exc

    data = {}
    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        if ":" not in raw_line:
            raise YAMLError(f"invalid line: {raw_line!r}")
        key, value = raw_line.split(":", 1)
        key = key.strip()
        value = value.strip()
        if not key:
            raise YAMLError("empty key")
        if value == "":
            parsed = ""
        elif value.lower() in {"null", "~"}:
            parsed = None
        elif value.lower() == "true":
            parsed = True
        elif value.lower() == "false":
            parsed = False
        elif (
            (value.startswith('"') and value.endswith('"'))
            or (value.startswith("'") and value.endswith("'"))
        ):
            parsed = value[1:-1]
        else:
            parsed = value
        data[key] = parsed
    return data
