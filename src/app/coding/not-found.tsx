import { CodingEmptyState, CodingShell } from "./coding-shell";
import styles from "./coding.module.css";

export default function NotFound() {
  return (
    <CodingShell>
      <div className={styles.missing}>
        <p className={styles.missingLabel}>404 · RECORD NOT FOUND</p>
        <CodingEmptyState kind="missing" />
      </div>
    </CodingShell>
  );
}
