import importlib.util
from pathlib import Path
import stat
import tempfile
import unittest

spec = importlib.util.spec_from_file_location(
    "host_database_setup",
    Path(__file__).resolve().parents[1] / "scripts/prepare-host-database.py",
)
setup = importlib.util.module_from_spec(spec)
spec.loader.exec_module(setup)


class DatabaseSetupSafetyTests(unittest.TestCase):
    def test_only_one_empty_database_assignment_is_accepted(self):
        for source in ["DATABASE_URL=\n", 'DATABASE_URL=""\n', "export DATABASE_URL = ''\n"]:
            setup.database_env_value(source)
        for source in ["", "DATABASE_URL=postgresql://existing/database", "DATABASE_URL=\nDATABASE_URL=\n", "DATABASE_URL=\nexport DATABASE_URL = postgresql://existing/db\n"]:
            with self.assertRaises(setup.SetupError):
                setup.database_env_value(source)

    def test_credential_files_are_private_and_never_overwritten(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "secret"
            setup.exclusive_private_file(path, "existing-secret")
            self.assertEqual(stat.S_IMODE(path.stat().st_mode), 0o600)
            with self.assertRaises(FileExistsError):
                setup.exclusive_private_file(path, "replacement")
            self.assertEqual(path.read_text(), "existing-secret")


if __name__ == "__main__":
    unittest.main()
