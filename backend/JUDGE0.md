# Free code execution with Judge0 CE

TeamFit sends source code and test input to Judge0 CE's isolated execution
workers through the RapidAPI Basic plan. The Render web service can stay on its
free plan. RapidAPI's free plan has usage limits and should be treated as a
development/demo option, not a capacity guarantee for a large live exam.

## Configure on Render

1. Create a RapidAPI account and subscribe to Judge0 CE's **Basic** plan.
2. Copy the RapidAPI key from the app's security settings.
3. In the TeamFit backend service on Render, add these environment variables:

   ```text
   JUDGE0_API_KEY=<your RapidAPI key>
   JUDGE0_URL=https://judge0-ce.p.rapidapi.com
   JUDGE0_HOST=judge0-ce.p.rapidapi.com
   ```

4. Save the environment variables and wait for the backend to redeploy.
5. Join an open exam as a student and use **Run tests** with a small solution.

Keep `JUDGE0_API_KEY` only in the backend's secret environment variables. Do not
put it in Vercel, the frontend bundle, a committed `.env` file, or student code.

The backend applies fixed CPU, wall-clock, memory, process, file-size, and
network limits. It sends each test case separately and returns details only for
public tests; hidden test results contribute to the grade without exposing
expected output. Provider quotas and rate limits can restrict how many tests
run during a session. Check RapidAPI's current plan limits before an exam.

## Local development

Set the same variables in an untracked `backend/.env` file. Without an API key,
the app starts normally, but code execution returns HTTP 503 with a setup hint.
