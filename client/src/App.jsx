import { useEffect, useMemo, useState } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { authApi, attendanceApi, memberApi } from './services/api';

const SummaryCard = ({ label, value, accent }) => (
  <div className="rounded-2xl bg-white/80 shadow-md backdrop-blur border border-white/60 p-5 transition hover:-translate-y-1">
    <p className="text-sm uppercase tracking-wide text-gray-500">{label}</p>
    <p className={`mt-2 text-3xl font-semibold text-brand-${accent}`}>{value}</p>
  </div>
);

const AttendanceToggle = ({ active, onToggle, label, disabled }) => (
  <button
    onClick={onToggle}
    disabled={disabled}
    className={`w-full rounded-xl border px-3 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-brand-400 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed ${
      active
        ? 'bg-brand-500 text-white border-brand-500 shadow-lg shadow-brand-200'
        : 'bg-white text-gray-700 border-gray-200 hover:border-brand-400'
    }`}
  >
    {label}
  </button>
);

const formatToday = () =>
  new Intl.DateTimeFormat('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());

function App() {
  const [authState, setAuthState] = useState({ checking: true, authed: false });
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const [members, setMembers] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [summary, setSummary] = useState({ totalMembers: 0, morningPresent: 0, eveningPresent: 0 });
  const [locks, setLocks] = useState({ morning: false, evening: false });
  const [dataLoading, setDataLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [newMember, setNewMember] = useState('');
  const [creatingMember, setCreatingMember] = useState(false);
  const [markingKey, setMarkingKey] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [commitPrompt, setCommitPrompt] = useState(null); // { session, action }
  const [commitPassword, setCommitPassword] = useState('');
  const [commitLoading, setCommitLoading] = useState(false);

  const attendanceMap = useMemo(() => {
    const map = new Map();
    attendance.forEach((entry) => {
      map.set(entry.member._id, entry);
    });
    return map;
  }, [attendance]);

  const enrichedMembers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return members
      .filter((member) => (query ? member.name.toLowerCase().includes(query) : true))
      .map((member) => {
        const record = attendanceMap.get(member._id);
        return {
          ...member,
          morning: record?.morning ?? false,
          evening: record?.evening ?? false,
        };
      });
  }, [attendanceMap, members, search]);

  useEffect(() => {
    const init = async () => {
      try {
        await authApi.me();
        setAuthState({ checking: false, authed: true });
      } catch (error) {
        console.warn('Auth check failed', error);
        setAuthState({ checking: false, authed: false });
      }
    };

    init();
  }, []);

  useEffect(() => {
    if (!authState.authed) return;

    const loadData = async () => {
      setDataLoading(true);
      try {
        await Promise.all([fetchMembers(), fetchAttendance(), fetchSummary()]);
      } finally {
        setDataLoading(false);
      }
    };

    loadData();
  }, [authState.authed]);

  const fetchMembers = async () => {
    const data = await memberApi.list();
    setMembers(data);
  };

  const fetchAttendance = async () => {
    const data = await attendanceApi.today();
    setAttendance(data);
  };

  const fetchSummary = async () => {
    const data = await attendanceApi.summary();
    setSummary({
      totalMembers: data.totalMembers,
      morningPresent: data.morningPresent,
      eveningPresent: data.eveningPresent,
    });
    setLocks({
      morning: data.locks?.morning ?? false,
      evening: data.locks?.evening ?? false,
    });
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    if (!password.trim()) {
      setLoginError('Password is required');
      return;
    }

    setLoginLoading(true);
    setLoginError('');
    try {
      await authApi.login(password.trim());
      setAuthState({ checking: false, authed: true });
      setPassword('');
      toast.success('Welcome back! 👋');
    } catch (error) {
      setLoginError(error.message);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } finally {
      setAuthState({ checking: false, authed: false });
      setAttendance([]);
      setMembers([]);
      setSummary({ totalMembers: 0, morningPresent: 0, eveningPresent: 0 });
      setLocks({ morning: false, evening: false });
      toast.success('You have logged out.');
    }
  };

  const handleCreateMember = async (event) => {
    event.preventDefault();
    if (!newMember.trim()) return;

    setCreatingMember(true);
    try {
      await memberApi.create(newMember.trim());
      setNewMember('');
      await Promise.all([fetchMembers(), fetchSummary()]);
      toast.success('Member added ✅');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setCreatingMember(false);
    }
  };

  const handleDeleteMember = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await memberApi.remove(deleteTarget._id);
      setMembers((prev) => prev.filter((member) => member._id !== deleteTarget._id));
      setAttendance((prev) => prev.filter((entry) => entry.member._id !== deleteTarget._id));
      await fetchSummary();
      toast.success(`${deleteTarget.name} removed`);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setDeleteLoading(false);
      setDeleteTarget(null);
    }
  };

  const handleToggle = async (memberId, session, current) => {
    const key = `${memberId}-${session}`;
    setMarkingKey(key);
    try {
      const updated = await attendanceApi.mark(memberId, session, !current);
      setAttendance((prev) => {
        const next = [...prev];
        const index = next.findIndex((entry) => entry.member._id === memberId);
        if (index >= 0) {
          next[index] = updated;
        } else {
          next.push(updated);
        }
        return next;
      });
      await fetchSummary();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setMarkingKey(null);
    }
  };

  const openCommitModal = (session, action) => {
    setCommitPrompt({ session, action });
    setCommitPassword('');
  };

  const handleCommit = async () => {
    if (!commitPrompt) return;
    if (!commitPassword.trim()) {
      toast.error('Please enter the admin password');
      return;
    }
    setCommitLoading(true);
    try {
      const response = await attendanceApi.commit(
        commitPrompt.session,
        commitPrompt.action,
        commitPassword.trim()
      );
      setLocks({
        morning: response.locks?.morning ?? locks.morning,
        evening: response.locks?.evening ?? locks.evening,
      });
      toast.success(response.message);
      await fetchSummary();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setCommitLoading(false);
      setCommitPrompt(null);
      setCommitPassword('');
    }
  };

  if (authState.checking) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-100 via-white to-stone-100">
        <div className="rounded-2xl bg-white/90 px-8 py-10 shadow-xl">
          <p className="text-lg font-medium text-gray-600">Loading dashboard...</p>
        </div>
      </main>
    );
  }

  if (!authState.authed) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-brand-100 via-orange-50 to-white flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-3xl bg-white/90 p-10 shadow-2xl border border-orange-100">
          <div className="mb-8 text-center space-y-2">
            <p className="text-sm uppercase tracking-[0.3em] text-brand-500">Presenty</p>
            <h1 className="text-3xl font-semibold text-gray-900">Admin Sign In</h1>
            <p className="text-gray-500">Secure access for attendance management</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="text-sm font-medium text-gray-700">Admin Password</label>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter password"
                className="mt-2 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-base focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100"
              />
              {loginError && <p className="mt-2 text-sm text-red-500">{loginError}</p>}
            </div>
            <button
              type="submit"
              disabled={loginLoading}
              className="w-full rounded-2xl bg-brand-500 py-3 text-white font-semibold shadow-lg shadow-brand-200 transition-all duration-300 hover:-translate-y-0.5 hover:bg-brand-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
            >
              {loginLoading ? 'Signing in...' : 'Access Dashboard'}
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-stone-100">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 lg:px-8">
        <header className="flex flex-col gap-4 rounded-3xl border border-white/60 bg-white/80 p-6 shadow-lg shadow-orange-100 backdrop-blur lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-brand-500">Presenty</p>
            <h1 className="text-3xl font-semibold text-gray-900">Attendance Control Center</h1>
            <p className="text-gray-500">{formatToday()}</p>
          </div>
          <button
            onClick={handleLogout}
            className="self-start rounded-2xl border border-brand-500 px-5 py-2.5 text-sm font-semibold text-brand-600 transition hover:bg-brand-50"
          >
            Log out
          </button>
        </header>

        <section className="grid gap-4 md:grid-cols-4">
          <SummaryCard label="Total Members" value={summary.totalMembers} accent={500} />
          <SummaryCard label="Morning Present" value={summary.morningPresent} accent={400} />
          <SummaryCard label="Evening Present" value={summary.eveningPresent} accent={600} />
          <div className="rounded-2xl border border-white/60 bg-white/90 p-5 shadow-md">
            <p className="text-sm font-semibold text-gray-700">Commit Status</p>
            <div className="mt-3 space-y-3">
              {['morning', 'evening'].map((session) => (
                <div key={session} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium text-gray-900 capitalize">{session}</p>
                    <p className={`text-xs ${locks[session] ? 'text-green-600' : 'text-gray-500'}`}>
                      {locks[session] ? 'Committed' : 'Editable'}
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      openCommitModal(session, locks[session] ? 'unlock' : 'lock')
                    }
                    className={`rounded-xl px-3 py-1 text-xs font-semibold transition ${
                      locks[session]
                        ? 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                        : 'bg-brand-500 text-white shadow hover:bg-brand-600'
                    }`}
                  >
                    {locks[session] ? 'Unlock' : 'Commit'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[2fr_3fr]">
          <div className="space-y-6">
            <div className="rounded-3xl border border-white/60 bg-white/90 p-6 shadow-lg">
              <h2 className="text-xl font-semibold text-gray-900">Add New Member</h2>
              <p className="text-sm text-gray-500">Only the name is required. Duplicates are prevented automatically.</p>
              <form onSubmit={handleCreateMember} className="mt-4 flex flex-col gap-3">
                <input
                  type="text"
                  value={newMember}
                  onChange={(event) => setNewMember(event.target.value)}
                  placeholder="Eg. Rahul Sharma"
                  className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-base focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100 transition-colors"
                />
                <button
                  type="submit"
                  disabled={creatingMember}
                  className="rounded-2xl bg-brand-500 py-3 text-white font-semibold shadow-lg shadow-brand-200 transition-all duration-300 hover:-translate-y-0.5 hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 active:scale-95"
                >
                  {creatingMember ? 'Adding...' : 'Add Member'}
                </button>
              </form>
            </div>

            <div className="rounded-3xl border border-white/60 bg-white/90 p-6 shadow-lg">
              <h2 className="text-xl font-semibold text-gray-900">Search Members</h2>
              <p className="text-sm text-gray-500">Type a name to quickly mark attendance.</p>
              <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by name"
                  className="w-full bg-transparent text-base focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/60 bg-white/90 p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Today's Attendance</h2>
                <p className="text-sm text-gray-500">
                  Tap Morning or Evening to toggle presence.
                </p>
              </div>
              {dataLoading && <span className="text-sm text-brand-500">Refreshing...</span>}
            </div>

            <div className="space-y-3">
              {enrichedMembers.length === 0 && (
                <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-gray-500">
                  {members.length === 0 ? 'Add members to begin tracking attendance.' : 'No members match that search.'}
                </div>
              )}

              {enrichedMembers.map((member) => (
                <div
                  key={member._id}
                  className="flex flex-col gap-3 rounded-2xl border border-white bg-gradient-to-r from-white to-orange-50/60 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-lg font-semibold text-gray-900">{member.name}</p>
                    <p className="text-sm text-gray-500">Joined {new Date(member.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="grid w-full gap-3 sm:w-auto sm:grid-cols-2">
                    <AttendanceToggle
                      label="Morning"
                      disabled={locks.morning || markingKey === `${member._id}-morning`}
                      active={member.morning}
                      onToggle={() => handleToggle(member._id, 'morning', member.morning)}
                    />
                    <AttendanceToggle
                      label="Evening"
                      disabled={locks.evening || markingKey === `${member._id}-evening`}
                      active={member.evening}
                      onToggle={() => handleToggle(member._id, 'evening', member.evening)}
                    />
                  </div>
                  <button
                    onClick={() => setDeleteTarget(member)}
                    className="inline-flex items-center justify-center rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-500 transition hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl transition-all duration-300">
            <h3 className="text-xl font-semibold text-gray-900">Delete member?</h3>
            <p className="mt-2 text-sm text-gray-600">
              {`Are you sure you want to remove ${deleteTarget.name}? Their attendance history will also be deleted.`}
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => !deleteLoading && setDeleteTarget(null)}
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
                disabled={deleteLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteMember}
                className="w-full rounded-2xl bg-red-500 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-70"
                disabled={deleteLoading}
              >
                {deleteLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {commitPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <h3 className="text-xl font-semibold text-gray-900">
              {commitPrompt.action === 'lock'
                ? `Commit ${commitPrompt.session} attendance?`
                : `Unlock ${commitPrompt.session} attendance?`}
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              {commitPrompt.action === 'lock'
                ? 'Once committed, no more changes can be made until you unlock with the admin password.'
                : 'Unlocking allows edits again. Confirm with the admin password.'}
            </p>
            <div className="mt-4">
              <label className="text-sm font-medium text-gray-700">Admin Password</label>
              <input
                type="password"
                value={commitPassword}
                onChange={(event) => setCommitPassword(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-base focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100"
                placeholder="Enter password"
              />
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => !commitLoading && setCommitPrompt(null)}
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
                disabled={commitLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleCommit}
                className="w-full rounded-2xl bg-brand-500 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-70"
                disabled={commitLoading}
              >
                {commitLoading
                  ? commitPrompt.action === 'lock'
                    ? 'Committing...'
                    : 'Unlocking...'
                  : commitPrompt.action === 'lock'
                    ? 'Commit now'
                    : 'Unlock now'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer position="top-center" theme="colored" />
    </main>
  );
}

export default App;
