import json
import os
import sys
import threading
import unittest
import urllib.error
import urllib.request
from http.server import ThreadingHTTPServer

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import helper  # noqa: E402


def envelope(text):
    """Mimic `claude -p --output-format json`."""
    return json.dumps({"type": "result", "is_error": False, "result": text})


class CleanStepsTests(unittest.TestCase):
    def test_good_answer(self):
        steps, notes = helper.clean_steps({"subtasks": ["Read the spec", "Draft outline"]}, "Essay")
        self.assertEqual(steps, ["Read the spec", "Draft outline"])
        self.assertEqual(notes, [])

    def test_strips_list_markers(self):
        steps, _ = helper.clean_steps({"subtasks": ["1. Read", "- Write", "\u2022 Submit"]}, "x")
        self.assertEqual(steps, ["Read", "Write", "Submit"])

    def test_drops_repeats_and_parent_echo(self):
        steps, notes = helper.clean_steps(
            {"subtasks": ["Study for exam", "Review notes", "review notes"]}, "Study for exam")
        self.assertEqual(steps, ["Review notes"])
        self.assertEqual(len(notes), 2)

    def test_drops_non_text_and_too_long(self):
        steps, notes = helper.clean_steps({"subtasks": [42, "x" * 300, "Ok step"]}, "t")
        self.assertEqual(steps, ["Ok step"])
        self.assertEqual(len(notes), 2)

    def test_caps_count(self):
        steps, notes = helper.clean_steps({"subtasks": [f"Step {n}" for n in range(10)]}, "t")
        self.assertEqual(len(steps), helper.MAX_STEPS)
        self.assertIn("showing the first", notes[0])

    def test_nothing_usable(self):
        with self.assertRaises(ValueError):
            helper.clean_steps({"subtasks": ["", "   "]}, "t")

    def test_wrong_shape(self):
        with self.assertRaises(ValueError):
            helper.clean_steps({"steps": ["a"]}, "t")


class ParsingTests(unittest.TestCase):
    def test_fenced_json_with_prose(self):
        text = 'Here you go:\n```json\n{"subtasks": ["a"]}\n```'
        self.assertEqual(helper.extract_json(text), {"subtasks": ["a"]})

    def test_envelope_error(self):
        with self.assertRaises(RuntimeError):
            helper.unwrap_envelope(json.dumps({"result": "usage limit", "is_error": True}))

    def test_retry_then_success(self):
        replies = iter([envelope("Sorry, I can't."), envelope('{"subtasks": ["Do it"]}')])
        result = helper.breakdown("Task", runner=lambda t: next(replies))
        self.assertEqual(result["attempts"], 2)
        self.assertEqual(result["subtasks"], ["Do it"])

    def test_gives_up_after_two(self):
        with self.assertRaises(RuntimeError):
            helper.breakdown("Task", runner=lambda t: envelope("nope"))

    def test_model_gets_the_task_text(self):
        seen = {}

        def runner(text):
            seen["text"] = text
            return envelope('{"subtasks": ["One"]}')

        helper.breakdown("Finish lab 4", runner=runner)
        self.assertEqual(seen["text"], "Finish lab 4")


class OriginTests(unittest.TestCase):
    def test_local_page(self):
        self.assertTrue(helper.origin_allowed("http://127.0.0.1:8765", "127.0.0.1:8765"))

    def test_codespaces_page(self):
        self.assertTrue(helper.origin_allowed(
            "https://my-space-8765.app.github.dev", "localhost:8765",
            "my-space-8765.app.github.dev"))

    def test_codespaces_host_header_already_rewritten(self):
        self.assertTrue(helper.origin_allowed(
            "https://my-space-8765.app.github.dev", "my-space-8765.app.github.dev"))

    def test_other_website(self):
        self.assertFalse(helper.origin_allowed(
            "https://evil.example", "localhost:8765", "my-space-8765.app.github.dev"))

    def test_no_origin(self):
        self.assertTrue(helper.origin_allowed(None, "127.0.0.1:8765"))

    def test_codespaces_url(self):
        old = dict(os.environ)
        try:
            os.environ.update({"CODESPACES": "true", "CODESPACE_NAME": "my-space",
                               "GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN": "app.github.dev"})
            self.assertEqual(helper.codespaces_url(8765), "https://my-space-8765.app.github.dev")
            os.environ["CODESPACES"] = "false"
            self.assertIsNone(helper.codespaces_url(8765))
        finally:
            os.environ.clear()
            os.environ.update(old)


class ServerTests(unittest.TestCase):
    """Start the real server on a free port with a fake model."""

    @classmethod
    def setUpClass(cls):
        helper.LOG_FILE = os.devnull
        cls.calls = []

        def fake_runner(text):
            cls.calls.append(text)
            return envelope('{"subtasks": ["Read the assignment", "Write the code"]}')

        cls.server = ThreadingHTTPServer(("127.0.0.1", 0), helper.make_handler(fake_runner))
        cls.base = f"http://127.0.0.1:{cls.server.server_address[1]}"
        threading.Thread(target=cls.server.serve_forever, daemon=True).start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()

    def post(self, body, headers=None):
        data = body if isinstance(body, bytes) else json.dumps(body).encode()
        req = urllib.request.Request(self.base + "/api/breakdown", data=data, method="POST",
                                     headers=headers or {"Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(req) as r:
                return r.status, json.loads(r.read())
        except urllib.error.HTTPError as e:
            return e.code, json.loads(e.read())

    def test_serves_app_files(self):
        for path in ("/", "/script.js", "/style.css"):
            with urllib.request.urlopen(self.base + path) as r:
                self.assertEqual(r.status, 200)

    def test_does_not_serve_other_files(self):
        for path in ("/helper.py", "/../etc/passwd", "/.breakdown-log.jsonl"):
            with self.assertRaises(urllib.error.HTTPError) as ctx:
                urllib.request.urlopen(self.base + path)
            self.assertEqual(ctx.exception.code, 404)

    def test_health(self):
        with urllib.request.urlopen(self.base + "/api/health") as r:
            self.assertEqual(json.loads(r.read()), {"ok": True})

    def test_breakdown(self):
        status, data = self.post({"text": "CS 490 artifact 3"})
        self.assertEqual(status, 200)
        self.assertEqual(data["subtasks"], ["Read the assignment", "Write the code"])

    def test_rejects_empty_and_long(self):
        self.assertEqual(self.post({"text": "  "})[0], 400)
        self.assertEqual(self.post({"text": "x" * 201})[0], 400)

    def test_rejects_other_websites(self):
        status, _ = self.post({"text": "hi"}, {"Content-Type": "application/json",
                                               "Origin": "https://evil.example"})
        self.assertEqual(status, 403)

    def test_accepts_codespaces_forwarded_page(self):
        status, _ = self.post({"text": "hi"}, {"Content-Type": "application/json",
                                               "Origin": "https://my-space-8765.app.github.dev",
                                               "X-Forwarded-Host": "my-space-8765.app.github.dev"})
        self.assertEqual(status, 200)

    def test_rejects_non_json(self):
        status, _ = self.post(b"text=hi", {"Content-Type": "application/x-www-form-urlencoded"})
        self.assertEqual(status, 415)

    def test_bad_requests_never_reach_the_model(self):
        before = len(self.calls)
        self.post({"text": ""})
        self.post({"text": "hi"}, {"Content-Type": "application/json", "Origin": "https://evil.example"})
        self.post(b"not json", {"Content-Type": "application/json"})
        self.assertEqual(len(self.calls), before)


if __name__ == "__main__":
    unittest.main()
