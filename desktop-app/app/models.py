from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import CheckConstraint, Float, ForeignKey, JSON, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.device import get_device_id


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class SyncMetadataMixin:
    sync_id: Mapped[str] = mapped_column(
        String(36), unique=True, index=True, default=lambda: str(uuid4())
    )
    version: Mapped[int] = mapped_column(default=1)
    updated_by_device: Mapped[str] = mapped_column(
        String(36), default=get_device_id
    )
    deleted_at: Mapped[datetime | None]


class Kol(SyncMetadataMixin, Base):
    __tablename__ = "kols"
    __table_args__ = (
        UniqueConstraint(
            "platform",
            "platform_account_id",
            name="uq_kol_platform_account",
        ),
        UniqueConstraint("platform", "handle", name="uq_kol_platform_handle"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str | None] = mapped_column(String(255))
    platform: Mapped[str] = mapped_column(String(50), index=True)
    platform_account_id: Mapped[str | None] = mapped_column(String(255))
    handle: Mapped[str | None] = mapped_column(String(255))
    profile_url: Mapped[str | None] = mapped_column(String(500))
    country: Mapped[str] = mapped_column(String(2), index=True)
    language: Mapped[str | None] = mapped_column(String(50))
    content_categories: Mapped[str | None] = mapped_column(Text)
    followers: Mapped[int | None]
    average_engagement_rate: Mapped[float | None] = mapped_column(Float)
    audience_country_ratio: Mapped[float | None] = mapped_column(Float)
    created_at: Mapped[datetime] = mapped_column(default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=utcnow, onupdate=utcnow)

    score_records: Mapped[list["ScoreRecord"]] = relationship(
        back_populates="kol",
        cascade="all, delete-orphan",
    )
    score_summary: Mapped["KolScoreSummary | None"] = relationship(
        back_populates="kol",
        cascade="all, delete-orphan",
        uselist=False,
    )
    assessment_input: Mapped["AssessmentInput | None"] = relationship(
        back_populates="kol", cascade="all, delete-orphan", uselist=False
    )
    workflow: Mapped["KolWorkflow | None"] = relationship(
        back_populates="kol", cascade="all, delete-orphan", uselist=False
    )
    regulation_reviews: Mapped[list["RegulationReview"]] = relationship(
        back_populates="kol", cascade="all, delete-orphan"
    )

    @property
    def workflow_stage(self) -> int:
        return self.workflow.stage if self.workflow is not None else 0

    @property
    def commercial_inputs(self) -> dict:
        return self.assessment_input.commercial_inputs if self.assessment_input else {}

    @property
    def risk_inputs(self) -> dict:
        return self.assessment_input.risk_inputs if self.assessment_input else {}

    @property
    def flags(self) -> list[str]:
        return self.assessment_input.flags if self.assessment_input else []

    @property
    def assessment_updated_at(self) -> datetime | None:
        return self.assessment_input.updated_at if self.assessment_input else None

    @property
    def workflow_updated_at(self) -> datetime | None:
        return self.workflow.updated_at if self.workflow else None


class AssessmentInput(Base):
    __tablename__ = "assessment_inputs"

    kol_id: Mapped[int] = mapped_column(
        ForeignKey("kols.id", ondelete="CASCADE"), primary_key=True
    )
    commercial_inputs: Mapped[dict] = mapped_column(JSON, default=dict)
    risk_inputs: Mapped[dict] = mapped_column(JSON, default=dict)
    flags: Mapped[list[str]] = mapped_column(JSON, default=list)
    source: Mapped[str | None] = mapped_column(String(500))
    updated_at: Mapped[datetime] = mapped_column(default=utcnow, onupdate=utcnow)

    kol: Mapped[Kol] = relationship(back_populates="assessment_input")


class KolWorkflow(Base):
    __tablename__ = "kol_workflows"
    __table_args__ = (
        CheckConstraint("stage >= 0 AND stage <= 6", name="ck_workflow_stage"),
    )

    kol_id: Mapped[int] = mapped_column(
        ForeignKey("kols.id", ondelete="CASCADE"), primary_key=True
    )
    stage: Mapped[int] = mapped_column(default=0)
    updated_at: Mapped[datetime] = mapped_column(default=utcnow, onupdate=utcnow)

    kol: Mapped[Kol] = relationship(back_populates="workflow")


class WorkflowHistory(Base):
    __tablename__ = "workflow_history"

    id: Mapped[int] = mapped_column(primary_key=True)
    kol_id: Mapped[int] = mapped_column(
        ForeignKey("kols.id", ondelete="CASCADE"), index=True
    )
    stage: Mapped[int]
    changed_at: Mapped[datetime] = mapped_column(default=utcnow)
    changed_by_device: Mapped[str] = mapped_column(
        String(36), default=get_device_id
    )


class Contract(SyncMetadataMixin, Base):
    __tablename__ = "contracts"

    id: Mapped[int] = mapped_column(primary_key=True)
    kol_id: Mapped[int] = mapped_column(
        ForeignKey("kols.id", ondelete="CASCADE"), index=True
    )
    title: Mapped[str] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(String(30), default="draft")
    currency: Mapped[str] = mapped_column(String(3), default="EUR")
    amount: Mapped[float | None] = mapped_column(Float)
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=utcnow, onupdate=utcnow)


class PerformanceReview(SyncMetadataMixin, Base):
    __tablename__ = "performance_reviews"

    id: Mapped[int] = mapped_column(primary_key=True)
    kol_id: Mapped[int] = mapped_column(
        ForeignKey("kols.id", ondelete="CASCADE"), index=True
    )
    campaign: Mapped[str] = mapped_column(String(255))
    impressions: Mapped[int | None]
    engagements: Mapped[int | None]
    conversions: Mapped[int | None]
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=utcnow, onupdate=utcnow)


class SyncEvent(Base):
    __tablename__ = "sync_events"

    event_id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid4())
    )
    entity_type: Mapped[str] = mapped_column(String(50), index=True)
    entity_id: Mapped[str] = mapped_column(String(36), index=True)
    operation: Mapped[str] = mapped_column(String(10))
    version: Mapped[int]
    payload: Mapped[dict] = mapped_column(JSON)
    changed_at: Mapped[datetime] = mapped_column(default=utcnow)
    changed_by_device: Mapped[str] = mapped_column(
        String(36), default=get_device_id
    )
    status: Mapped[str] = mapped_column(
        String(20), default="pending", index=True
    )
    attempts: Mapped[int] = mapped_column(default=0)
    next_attempt_at: Mapped[datetime] = mapped_column(default=utcnow)
    last_error: Mapped[str | None] = mapped_column(Text)


class SyncState(Base):
    __tablename__ = "sync_state"

    key: Mapped[str] = mapped_column(String(50), primary_key=True)
    value: Mapped[str] = mapped_column(Text, default="")
    updated_at: Mapped[datetime] = mapped_column(default=utcnow, onupdate=utcnow)


class SyncConflict(Base):
    __tablename__ = "sync_conflicts"

    id: Mapped[int] = mapped_column(primary_key=True)
    entity_type: Mapped[str] = mapped_column(String(50), index=True)
    entity_id: Mapped[str] = mapped_column(String(36), index=True)
    local_payload: Mapped[dict] = mapped_column(JSON)
    remote_payload: Mapped[dict] = mapped_column(JSON)
    fields: Mapped[list[str]] = mapped_column(JSON, default=list)
    status: Mapped[str] = mapped_column(String(20), default="open", index=True)
    created_at: Mapped[datetime] = mapped_column(default=utcnow)
    resolved_at: Mapped[datetime | None]


class RegulationReview(Base):
    __tablename__ = "regulation_reviews"
    __table_args__ = (
        UniqueConstraint(
            "kol_id",
            "regulation_id",
            "published_at",
            name="uq_regulation_review_event",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    kol_id: Mapped[int] = mapped_column(
        ForeignKey("kols.id", ondelete="CASCADE"), index=True
    )
    regulation_id: Mapped[str] = mapped_column(String(100), index=True)
    regulation_name: Mapped[str] = mapped_column(String(500), default="")
    change_type: Mapped[str] = mapped_column(String(50), default="")
    summary: Mapped[str] = mapped_column(Text, default="")
    affected_scenarios: Mapped[list[str]] = mapped_column(JSON, default=list)
    published_at: Mapped[str] = mapped_column(String(100), default="")
    status: Mapped[str] = mapped_column(String(30), default="待更新")
    created_at: Mapped[datetime] = mapped_column(default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=utcnow, onupdate=utcnow)

    kol: Mapped[Kol] = relationship(back_populates="regulation_reviews")


class ScoreRecord(Base):
    __tablename__ = "score_records"
    __table_args__ = (
        UniqueConstraint(
            "kol_id",
            "score_type",
            "dimension",
            name="uq_kol_score_dimension",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    kol_id: Mapped[int] = mapped_column(ForeignKey("kols.id", ondelete="CASCADE"))
    score_type: Mapped[str] = mapped_column(String(20))
    dimension: Mapped[str] = mapped_column(String(100))
    auto_score: Mapped[float | None] = mapped_column(Float)
    manual_score: Mapped[float | None] = mapped_column(Float)
    evidence: Mapped[str | None] = mapped_column(Text)
    source: Mapped[str | None] = mapped_column(String(500))
    manual_evidence: Mapped[str | None] = mapped_column(Text)
    manual_source: Mapped[str | None] = mapped_column(String(500))
    scored_at: Mapped[datetime] = mapped_column(default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=utcnow, onupdate=utcnow)

    kol: Mapped[Kol] = relationship(back_populates="score_records")

    @property
    def final_score(self) -> float | None:
        return self.manual_score if self.manual_score is not None else self.auto_score


class KolScoreSummary(Base):
    __tablename__ = "kol_score_summaries"

    id: Mapped[int] = mapped_column(primary_key=True)
    kol_id: Mapped[int] = mapped_column(
        ForeignKey("kols.id", ondelete="CASCADE"),
        unique=True,
    )
    commercial_score: Mapped[float | None] = mapped_column(Float)
    commercial_completeness: Mapped[float] = mapped_column(Float, default=0.0)
    commercial_status: Mapped[str] = mapped_column(String(20), default="insufficient")
    risk_score: Mapped[float | None] = mapped_column(Float)
    risk_completeness: Mapped[float] = mapped_column(Float, default=0.0)
    risk_status: Mapped[str] = mapped_column(String(20), default="insufficient")
    risk_level: Mapped[str | None] = mapped_column(String(20))
    updated_at: Mapped[datetime] = mapped_column(default=utcnow, onupdate=utcnow)

    kol: Mapped[Kol] = relationship(back_populates="score_summary")


class ImportJob(Base):
    __tablename__ = "import_jobs"

    id: Mapped[int] = mapped_column(primary_key=True)
    filename: Mapped[str] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(String(30))
    total_rows: Mapped[int] = mapped_column(default=0)
    created_count: Mapped[int] = mapped_column(default=0)
    updated_count: Mapped[int] = mapped_column(default=0)
    failed_count: Mapped[int] = mapped_column(default=0)
    created_at: Mapped[datetime] = mapped_column(default=utcnow)

    errors: Mapped[list["ImportError"]] = relationship(
        back_populates="job",
        cascade="all, delete-orphan",
    )


class ImportError(Base):
    __tablename__ = "import_errors"

    id: Mapped[int] = mapped_column(primary_key=True)
    job_id: Mapped[int] = mapped_column(ForeignKey("import_jobs.id", ondelete="CASCADE"))
    row_number: Mapped[int]
    message: Mapped[str] = mapped_column(Text)

    job: Mapped[ImportJob] = relationship(back_populates="errors")


class CollectionJob(Base):
    __tablename__ = "collection_jobs"

    id: Mapped[int] = mapped_column(primary_key=True)
    status: Mapped[str] = mapped_column(String(30), default="queued")
    keywords: Mapped[list[str]] = mapped_column(JSON, default=list)
    platforms: Mapped[list[str]] = mapped_column(JSON, default=list)
    languages: Mapped[list[str]] = mapped_column(JSON, default=list)
    markets: Mapped[list[str]] = mapped_column(JSON, default=list)
    limit_per_platform: Mapped[int] = mapped_column(default=30)
    total_found: Mapped[int] = mapped_column(default=0)
    created_count: Mapped[int] = mapped_column(default=0)
    updated_count: Mapped[int] = mapped_column(default=0)
    skipped_count: Mapped[int] = mapped_column(default=0)
    failed_count: Mapped[int] = mapped_column(default=0)
    created_at: Mapped[datetime] = mapped_column(default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=utcnow, onupdate=utcnow)

    logs: Mapped[list["CollectionJobLog"]] = relationship(
        back_populates="job",
        cascade="all, delete-orphan",
        order_by="CollectionJobLog.id",
    )


class CollectionJobLog(Base):
    __tablename__ = "collection_job_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    job_id: Mapped[int] = mapped_column(
        ForeignKey("collection_jobs.id", ondelete="CASCADE")
    )
    platform: Mapped[str | None] = mapped_column(String(50))
    level: Mapped[str] = mapped_column(String(20), default="info")
    message: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(default=utcnow)

    job: Mapped[CollectionJob] = relationship(back_populates="logs")


class Shortlist(Base):
    __tablename__ = "shortlists"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
    target_country: Mapped[str | None] = mapped_column(String(2))
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(default=utcnow)

    items: Mapped[list["ShortlistItem"]] = relationship(
        back_populates="shortlist",
        cascade="all, delete-orphan",
    )


class ShortlistItem(Base):
    __tablename__ = "shortlist_items"
    __table_args__ = (
        UniqueConstraint("shortlist_id", "kol_id", name="uq_shortlist_kol"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    shortlist_id: Mapped[int] = mapped_column(
        ForeignKey("shortlists.id", ondelete="CASCADE")
    )
    kol_id: Mapped[int] = mapped_column(ForeignKey("kols.id", ondelete="CASCADE"))
    priority: Mapped[int | None]
    recommendation: Mapped[str | None] = mapped_column(Text)

    shortlist: Mapped[Shortlist] = relationship(back_populates="items")
    kol: Mapped[Kol] = relationship()
