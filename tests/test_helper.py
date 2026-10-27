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
