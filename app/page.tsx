import CreatePool from "./components/CreatePool";
import JoinExisting from "./components/JoinExisting";

export default function Home() {
  return (
    <>
      <h1>Office World Cup 2026 Pool</h1>
      <p className="muted">
        Create a pool, share a link, and let everyone make picks. Standings update automatically from
        live results — no spreadsheets, no daily admin work.
      </p>
      <CreatePool />
      <JoinExisting />
    </>
  );
}
