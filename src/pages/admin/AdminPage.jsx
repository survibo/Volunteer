import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { Search } from "lucide-react";
import { listMembers } from "../../lib/memberApi";

function memberNumberText(member) {
  return member.member_number ?? "미부여";
}

export default function AdminPage() {
  const [members, setMembers] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

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
    if (!keyword) {
      return members;
    }

    return members.filter((member) =>
      [
        member.name,
        member.member_number,
        member.phone,
        member.email,
        member.workplace_or_school,
      ]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(keyword))
    );
  }, [members, query]);

  return (
    <section className="grid gap-6">
      <div className="grid gap-3">
        <h1 className="text-3xl font-bold leading-tight text-text-primary md:text-5xl">
          관리자 대시보드
        </h1>
        <p className="text-sm text-text-secondary">
          회원 목록을 검색하고 상세 정보를 확인합니다.
        </p>
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
          <p className="text-sm text-text-secondary">
            회원 목록을 불러오는 중입니다.
          </p>
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
    </section>
  );
}
