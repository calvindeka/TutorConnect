# Continuous Deployment (CD) Setup

## What's already done

- ✅ `deploy.sh` is committed and tested manually on the server.
- ✅ `.github/workflows/cd.yml` is configured to run on the `self-hosted` runner after every successful CI on `main`.
- ✅ A self-hosted runner named `kenyon-server` is **registered** with the repo (visible at https://github.com/calvindeka/TutorConnect/settings/actions/runners).
- ✅ PM2 keeps the deployed app alive.

## The one wrinkle: the Kenyon server kills user processes on logout

The CD assignment explicitly says: **"For this assignment, it is acceptable to run the self-hosted runner manually."** This server has `Linger=no`, which means any process I start over SSH (including the runner) gets killed when my SSH session ends. Until the sysadmin enables lingering for `deka1`, the runner has to be started manually before every demo.

## How to start the runner before a demo (one terminal, one minute)

```bash
ssh deka1@10.192.145.179
cd ~/actions-runner
./run.sh
```

That's it. **Leave that terminal open.** The runner prints "Listening for Jobs" once it's connected. From that moment on, every push to `main` will:

1. Run CI on GitHub-hosted runners (free)
2. If CI passes, dispatch the CD workflow to the `kenyon-server` runner
3. The runner pulls the latest commit, runs `deploy.sh`, and PM2 restarts the app
4. Within ~30 seconds the new version is live at http://10.192.145.179:4131

## How to verify CD is working end-to-end

1. Start the runner (above).
2. From another terminal locally, push a tiny visible change:
   ```bash
   echo "<!-- $(date) -->" >> client/index.html
   git commit -am "test: trigger CD" && git push
   ```
3. Watch on GitHub: <https://github.com/calvindeka/TutorConnect/actions>
4. CI runs (~1 min). If it passes, CD picks up automatically (~30s).
5. Reload http://10.192.145.179:4131 — your change is live.

## Permanent fix (sysadmin task)

To make the runner survive SSH disconnects:

```bash
sudo loginctl enable-linger deka1
```

Once that's done, install the runner as a user systemd service:

```bash
cd ~/actions-runner
./svc.sh install
./svc.sh start
./svc.sh status
```

Then it runs forever, autostarts on reboot, and CD works automatically without any manual step.
