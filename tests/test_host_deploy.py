import contextlib
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("host_deploy", Path(__file__).resolve().parents[1] / "scripts/deploy-host-admin.py")
deploy = importlib.util.module_from_spec(spec)
spec.loader.exec_module(deploy)


class DeploymentRecoveryTests(unittest.TestCase):
    def test_switch_refuses_a_real_directory(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            current, target = root / "current", root / "new"
            current.mkdir()
            target.mkdir()
            with self.assertRaises(deploy.DeployError):
                deploy.switch_release(current, target)
            self.assertTrue(current.is_dir())
            self.assertFalse(current.is_symlink())

    def restore_fixture(self, root):
        web, backups = root / "web", root / "backups"
        old, new = web / "releases/old", web / "releases/new"
        old.mkdir(parents=True)
        new.mkdir()
        current = web / "current"
        current.symlink_to(new)
        nginx, dropin = root / "nginx.conf", root / "admin.conf"
        nginx.write_bytes(b"new nginx")
        dropin.write_bytes(b"new dropin")
        backup = backups / "deploy-fixture"
        backup.mkdir(parents=True)
        (backup / "nginx.conf").write_bytes(b"old nginx")
        sha = lambda value: hashlib.sha256(value).hexdigest()
        state = {"old_release": str(old), "new_release": str(new), "previous_commit": "old", "had_dropin": False, "old_nginx_sha256": sha(b"old nginx"), "new_nginx_sha256": sha(b"new nginx"), "old_dropin_sha256": None, "new_dropin_sha256": sha(b"new dropin")}
        (backup / "state.json").write_text(json.dumps(state))
        return dict(WEB=web, CURRENT=current, NGINX=nginx, DROPIN=dropin, BACKUPS=backups), backup, old

    def test_rollback_restores_link_and_config_without_database_commands(self):
        with tempfile.TemporaryDirectory() as temporary:
            settings, backup, old = self.restore_fixture(Path(temporary))
            commands = []
            with patch.multiple(deploy, **settings), patch.object(deploy, "check_private_file"), patch.object(deploy, "health") as health, patch.object(deploy, "run", side_effect=lambda args: commands.append(args)), contextlib.redirect_stdout(io.StringIO()):
                deploy.rollback(backup)
            self.assertEqual(settings["CURRENT"].resolve(), old)
            self.assertEqual(settings["NGINX"].read_bytes(), b"old nginx")
            self.assertFalse(settings["DROPIN"].exists())
            self.assertTrue(all(command[0] in ["nginx", "systemctl"] for command in commands))
            health.assert_called_once_with(3000, "old", database=False)

    def test_rollback_does_not_overwrite_intervening_configuration_changes(self):
        with tempfile.TemporaryDirectory() as temporary:
            settings, backup, old = self.restore_fixture(Path(temporary))
            settings["NGINX"].write_bytes(b"operator change")
            with patch.multiple(deploy, **settings), patch.object(deploy, "check_private_file"), patch.object(deploy, "run") as run:
                with self.assertRaises(deploy.DeployError):
                    deploy.rollback(backup)
                run.assert_not_called()
            self.assertEqual(settings["NGINX"].read_bytes(), b"operator change")
            self.assertNotEqual(settings["CURRENT"].resolve(), old)


if __name__ == "__main__":
    unittest.main()
