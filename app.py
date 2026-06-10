import os

from sedori import create_app

app = create_app()

if __name__ == "__main__":
    debug = os.environ.get("SEDORI_DEBUG") == "1"
    if not debug:
        # 初心者向け: 起動したらブラウザを自動で開く
        import threading
        import webbrowser
        threading.Timer(1.5, lambda: webbrowser.open("http://127.0.0.1:5050")).start()
    app.run(host="127.0.0.1", port=5050, debug=debug)
