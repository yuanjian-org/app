
Steps to to download meeting transcripts and upload their summaries:

1. Determine a summary key the system should use to identify the summaries you will upload. Choose a key so it uniquely
identify the LLM configuration and prompt set. Let's use `llm-v1` as an example.

2. Use [`/api/v1/summaries.list`](../src/api/routes/summaries.ts) to download all the "crude summaries" to be summarized. A crude summary is the original transcript of a meeting. "原始文字" is the key of all crude summaries.
```
$ curl -G https://${HOST}/api/v1/summaries.list \
  -H "Authorization: Bearer ${INTEGRATION_AUTH_TOKEN}" \
  --data-urlencode 'input={ "key": "原始文字", "excludeTranscriptsWithKey": "llm-v1" }' \
  | jq .
```

3. Generate a summary for each transcript. The generation code should be checked into git repo [yuanjian-org/nlp](https://github.com/yuanjian-org/nlp).

4. Use [`/api/v1/summaries.write`](../src/api/routes/summaries.ts) to upload generated summaries.
```
$ curl -X POST https://${HOST}/api/v1/summaries.write \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${INTEGRATION_AUTH_TOKEN}" \
  -d '{ \
    "transcriptId": "12345", \
    "summaryKey": "llm-v1", \
    "summary": "..." }'
```
Replace `12345` with the transaction ids you got from Step 2.