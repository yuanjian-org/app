
Steps to to download meeting transcripts and upload their summaries:

1. Determine a summary key the system should use to identify the summaries you will upload. Choose a key so it uniquely
identify the LLM configuration and prompt set. Let's use `llm-v1` as an example.

2. Use [`/api/v1/summaries.list`](../src/api/routes/summaries.ts) to download all the raw transcripts to be summarized.
```
$ curl -G https://${HOST}/api/v1/summaries.list \
  -H "Authorization: Bearer ${INTEGRATION_AUTH_TOKEN}" \
  --data-urlencode 'input={ "key": "原始文字", "excludeTranscriptsWithKey": "llm-v1" }' \
  | jq .
```

The response data has the following format:
```
{
  "result": {
    "data": [
      {
        "transcriptId": "12345",
        "summary": "Foo(00:00:01): Hello\n\nBar(00:00:05): HiHi..."
      }, ...
    ]
  ]
}
```

According to the data model, a [`Transcript`](../src/api/database/models/Transcript.ts) is a recorded meeting. Each meating
has a raw transcript and muliple summaries generated from this raw transcript. Both the raw transcript and the summaries
are modeled as [`Summary`](../src/api/database/models/Summary.ts) objects. Hence, each `Transcript` has a bunch of
`Summary` objects. I know it's confusing. It is modeled this way to map to how Tencent Meeting models meeting records.

In this above example, `key` identifies a `Summary` within the scope of a `Transcript`. `原始文字` is the key for the raw
transcript of a `Transcript`. `excludeTranscriptsWithKey` is an optional parameter. It tells the API to skip
`Transcript`s that already have summaries identified by the key.

3. Generate a summary for each transcript. Check in the generation code to under the [`llm`](../llm) folder.

4. Upload generated summaries using [`/api/v1/summaries.write`](../src/api/routes/summaries.ts).
```
$ curl -X POST https://${HOST}/api/v1/summaries.write \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${INTEGRATION_AUTH_TOKEN}" \
  -d '{ \
    "transcriptId": "12345", \
    "summaryKey": "llm-v1", \
    "summary": "..." }'
```
Replace `12345` with the actual transaction Ids received from Step 2.