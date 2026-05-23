import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { Download, Search } from "lucide-react";
import TopLoadingBar from "../../components/TopLoadingBar";
import { listMembers } from "../../lib/memberApi";

function memberNumberText(member) {
  return member.member_number ?? "미부여";
}

const exportRoleOptions = [
  { value: "member", label: "정회원" },
  { value: "pending", label: "준회원" },
  { value: "admin", label: "관리자" },
];

const filterRoleOptions = [
  { value: "all", label: "전체" },
  { value: "pending", label: "준회원" },
  { value: "member", label: "정회원" },
  { value: "admin", label: "관리자" },
];

function roleLabel(role) {
  if (role === "admin") return "관리자";
  if (role === "member") return "정회원";
  return "준회원";
}

function formatExportDate(iso) {
  if (!iso) return "";
  const date = new Date(iso);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${d} ${hh}:${mm}`;
}

function formatFilenameDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${y}${m}${d}_${hh}${mm}`;
}

export default function AdminPage() {
  const [members, setMembers] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportRoles, setExportRoles] = useState(
    () => new Set(["member", "pending", "admin"])
  );
  const [roleFilter, setRoleFilter] = useState("all");

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const data = await listMembers();
        if (mounted) {
          setMembers(data);
        }
      } catch (error) {
        if (mounted) {
          setErrorMessage(error.message);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const filteredMembers = useMemo(() => {
    const keyword = query.trim().toLowerCase();

    return members.filter((member) => {
      if (roleFilter !== "all" && member.role !== roleFilter) {
        return false;
      }

      if (!keyword) {
        return true;
      }

      return [
        member.name,
        member.member_number,
        member.phone,
        member.email,
        member.workplace_or_school,
      ]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(keyword));
    });
  }, [members, query, roleFilter]);

  function toggleExportRole(role) {
    setExportRoles((prev) => {
      const next = new Set(prev);
      if (next.has(role)) {
        next.delete(role);
      } else {
        next.add(role);
      }
      return next;
    });
  }

  async function exportMembers() {
    const XLSX = await import("xlsx");
    const selectedRoles = [...exportRoles];
    const rows = members
      .filter((member) => selectedRoles.includes(member.role))
      .map((member) => [
        formatExportDate(member.created_at),
        member.name ?? "",
        memberNumberText(member),
        roleLabel(member.role),
        member.phone ?? "",
        member.email ?? "",
        member.workplace_or_school ?? "",
        member.address ?? "",
        member.address_detail ?? "",
        member.license_number ?? "",
      ]);

    const worksheet = XLSX.utils.aoa_to_sheet([
      ["전체 사용자 목록"],
      [],
      [
        "가입일",
        "이름",
        "회원번호",
        "구분",
        "전화번호",
        "이메일",
        "소속",
        "주소",
        "상세주소",
        "면허번호",
      ],
      ...rows,
    ]);
    worksheet["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 9 } }];
    worksheet["!cols"] = [
      { wch: 16 },
      { wch: 12 },
      { wch: 12 },
      { wch: 10 },
      { wch: 16 },
      { wch: 28 },
      { wch: 20 },
      { wch: 28 },
      { wch: 20 },
      { wch: 16 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "사용자 목록");
    XLSX.writeFile(
      workbook,
      `전체사용자목록_${formatFilenameDate(new Date())}.xlsx`
    );
    setExportModalOpen(false);
  }

  return (
    <section className="grid gap-6">
      <div className="grid gap-3">
        <h1 className="text-3xl font-bold leading-tight text-text-primary md:text-5xl">
          관리자 대시보드
        </h1>
        <p className="text-sm text-text-secondary">
          회원 목록을 검색하고 상세 정보를 확인합니다.
        </p>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            className="inline-flex min-h-[38px] cursor-pointer items-center justify-center gap-2 rounded-lg border border-border-default bg-white px-4 text-sm font-semibold text-text-primary hover:bg-surface-subtle"
            type="button"
            onClick={() => setExportModalOpen(true)}
          >
            <Download size={16} />
            Excel 추출
          </button>
          <select
            className="min-h-[38px] w-28 rounded-lg border border-border-default bg-white px-3 text-sm font-medium text-text-primary"
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value)}
          >
            {filterRoleOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid gap-4 rounded-xl border border-border-default bg-surface-base p-5">
        <label className="relative block">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary"
            size={18}
          />
          <input
            className="min-h-11 w-full rounded-lg border border-border-default bg-white pl-10 pr-3 text-text-primary placeholder:text-text-tertiary"
            placeholder="이름, 회원번호, 전화번호..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>

        {loading ? (
          <TopLoadingBar />
        ) : errorMessage ? (
          <p className="text-sm text-status-error-text">{errorMessage}</p>
        ) : filteredMembers.length === 0 ? (
          <p className="text-sm text-text-secondary">표시할 회원이 없습니다.</p>
        ) : (
          <div className="grid gap-2">
            {filteredMembers.map((member) => (
              <Link
                className="grid gap-1 rounded-lg border border-border-default bg-white px-4 py-3 hover:bg-surface-subtle sm:grid-cols-[1fr_auto] sm:items-center"
                key={member.id}
                to={`/admin/members/${member.id}`}
              >
                <span className="flex flex-wrap items-center gap-2 font-semibold text-text-primary">
                  <span>{member.name}</span>
                  {member.role === "admin" && (
                    <span className="rounded-md border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">
                      관리자
                    </span>
                  )}
                </span>
                <span className="text-sm font-medium text-text-secondary">
                  {memberNumberText(member)}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
      {exportModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setExportModalOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-xl bg-surface-base p-6 shadow-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-action-default">
              Excel 추출
            </p>
            <h2 className="text-lg font-bold text-text-primary">
              추출할 사용자 구분을 선택하세요.
            </h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {exportRoleOptions.map((option) => {
                const selected = exportRoles.has(option.value);
                return (
                  <button
                    key={option.value}
                    className={
                      selected
                        ? "min-h-[38px] rounded-lg bg-action-default px-4 text-sm font-semibold text-white"
                        : "min-h-[38px] rounded-lg border border-border-default bg-white px-4 text-sm font-semibold text-text-secondary hover:bg-surface-subtle"
                    }
                    type="button"
                    onClick={() => toggleExportRole(option.value)}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-sm text-text-secondary">
              이름, 회원번호, 구분, 소속, 전화번호, 이메일, 주소, 면허번호,
              가입일이 포함됩니다.
            </p>
            <div className="mt-5 flex gap-2.5">
              <button
                className="inline-flex min-h-[44px] flex-1 cursor-pointer items-center justify-center rounded-xl bg-action-default px-5 font-semibold text-white hover:bg-action-hover disabled:cursor-not-allowed disabled:opacity-50"
                disabled={exportRoles.size === 0}
                type="button"
                onClick={exportMembers}
              >
                추출
              </button>
              <button
                className="inline-flex min-h-[44px] flex-1 cursor-pointer items-center justify-center rounded-xl border border-border-default bg-white px-5 font-medium text-text-primary hover:bg-surface-subtle"
                type="button"
                onClick={() => setExportModalOpen(false)}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
