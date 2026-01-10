import { useSearchParams } from "react-router-dom";
import NotesPage from "./NotesPage";

export default function NotesPageWrapper() {
  const [query] = useSearchParams();
  const subjectId = query.get("subjectId") || "";
  const branch = query.get("branch") || "";
  const semester = query.get("semester") || "";
  console.log("[NotesPageWrapper] render", { subjectId, branch, semester });
  return (
    <NotesPage key={`${subjectId}-${branch}-${semester}`} />
  );
}
