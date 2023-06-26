
Instructions to to download meeting transcripts, generate and upload summarization:

1. Get transcript Ids and download URLs using `/api/v1/transcripts.list`. See documentation in [transcripts.ts](../src/api/routes/transcripts.ts).
1. Download transcripts from the URLs.
1. Run LLM to generate a summary for each transcript. LLM code should be checked into git repo [yuanjian-org/nlp](https://github.com/yuanjian-org/nlp).
1. Uplaod summaries using `/api/v1/summaries.write`. See documentation in [summaries.ts](../src/api/routes/summaries.ts).
   Choose a unique `summaryKey` so it can identify the LLM configuration used to generate the summary.
