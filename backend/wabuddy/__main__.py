"""Run the local WABuddy application: python -m wabuddy."""
import argparse
import multiprocessing

import uvicorn

from .app import create_app


def main():
    parser = argparse.ArgumentParser(description="WABuddy local WhatsApp pairing app")
    parser.add_argument("--port", type=int, default=8787)
    args = parser.parse_args()
    app = create_app()
    server = uvicorn.Server(uvicorn.Config(app, host="127.0.0.1", port=args.port,
                                          log_level="warning", access_log=False))
    app.state.request_shutdown = lambda: setattr(server, "should_exit", True)
    server.run()


if __name__ == "__main__":
    multiprocessing.freeze_support()
    main()
