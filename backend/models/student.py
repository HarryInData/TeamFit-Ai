class Student:
    """Student data model — matches the global API contract."""

    def __init__(
        self,
        student: str,
        keystrokes: int = 0,
        score: int = 0,
        activity: str = "idle",
        role: str = "",
        contribution: float = 0.0,
    ):
        self.student = student
        self.keystrokes = keystrokes
        self.score = score
        self.activity = activity
        self.role = role
        self.contribution = contribution

    def to_dict(self) -> dict:
        return {
            "student": self.student,
            "keystrokes": self.keystrokes,
            "score": self.score,
            "activity": self.activity,
            "role": self.role,
            "contribution": self.contribution,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "Student":
        return cls(
            student=data.get("student", ""),
            keystrokes=data.get("keystrokes", 0),
            score=data.get("score", 0),
            activity=data.get("activity", "idle"),
            role=data.get("role", ""),
            contribution=data.get("contribution", 0.0),
        )


# ── In-memory storage (hackathon MVP) ──
students_db: dict[str, dict] = {}

# ── Users storage (simplified auth) ──
users_db: dict[str, dict] = {
    # Pre-seeded demo accounts
    "student@teamfit.ai": {
        "id": "s1",
        "name": "Rohan",
        "email": "student@teamfit.ai",
        "password": "demo123",
        "role": "student",
        "avatar": "",
    },
    "professor@teamfit.ai": {
        "id": "p1",
        "name": "Dr. Smith",
        "email": "professor@teamfit.ai",
        "password": "demo123",
        "role": "professor",
        "avatar": "",
    },
}

# ── Sessions storage ──
sessions_db: dict[str, dict] = {
    "session-1": {
        "session_id": "session-1",
        "course": "CS101: Intro to Python",
        "project": "GROUP PROJECT A",
        "members": ["Rohan", "Harry", "Sarah", "James"],
    }
}
