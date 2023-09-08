"""
Please set environment variable INTEGRATION_AUTH_TOKEN for beta.yuanjian.org
"""

import requests
import pycurl
import json
import pandas as pd
import re
import os
from urllib.parse import urlencode

import random
import numpy as np
import torch

seed = 0
random.seed(seed)
np.random.seed(seed)
torch.manual_seed(seed)
torch.cuda.manual_seed(seed)
torch.backends.cudnn.deterministic = True

from transformers import AutoTokenizer, AutoModel

MODEL_NAME = "THUDM/chatglm-6b"

tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME, trust_remote_code=True)
model = AutoModel.from_pretrained(MODEL_NAME, trust_remote_code=True).half().cuda()
model = model.eval()

url_get = "https://beta.yuanjian.org/api/v1/summaries.list"
url_post = 'https://beta.yuanjian.org/api/v1/summaries.write'
headers_get = {"Authorization": "Bearer {}".format(os.environ['INTEGRATION_AUTH_TOKEN'])}
headers_post = ["Authorization: Bearer {}".format(os.environ['INTEGRATION_AUTH_TOKEN']),
                "Content-Type: application/x-www-form-urlencoded"]  #


def get_list(url, headers, params):
    """
    调用api 获取原始文档
    """
    r = requests.get(url, headers=headers, params={"input": json.dumps(params)}).json()

    return r["result"]["data"]


def post_summary(url, headers, transcriptId, summaryKey, result_summary):
    """
    调用api 上传文本摘要
    """

    post_data = {'transcriptId': transcriptId,
                 'summaryKey': summaryKey,
                 'summary': result_summary}

    c = pycurl.Curl()
    c.setopt(c.URL, url)
    c.setopt(pycurl.HTTPHEADER, headers)

    postfields = urlencode(post_data)
    c.setopt(c.POSTFIELDS, postfields)

    data = []

    def collect_data(chunk):
        data.append(chunk)

    c.setopt(c.WRITEFUNCTION, collect_data)

    c.perform()
    c.close()

    return data


def preprocess(txt, name, person_dict):
    """
    读取文本中说话人，标记：ABCDE等，最多识别和标记20人。
    INPUT:
        txt:原始文本
        name:说话人
        person_dict:{说话人：标记}
    RETURN：
        df:
        {dialogs: 标记ABCDE的原始对话，去除空行
        time: 原始对话时间}

    """

    tm = []
    txtAB = []
    for t in txt:
        if len(t.strip()) > 0:
            tm.append(t[t.find("("):t.find(")") + 1])  # 时间
            flag = 0
            for n in name:
                if t[:t.find("(")].strip().find(n) >= 0:
                    txtAB.append(re.sub(n + r'(\(.+\))', person_dict[n], t.strip()))
                    flag = 1
                    break
            if flag == 0:
                print(t)
    df = pd.DataFrame({"dialogs": txtAB, "time": tm})

    return df


def section_summarize(df, section_len, part_len):
    """
    划分section, section 摘要，全文摘要，全文主题提取
    INPUT:
        df: preprocess()结果df
        section_len: section长度
        part_len: 全文摘要使用的单元长度
    RETURN:
        df_s: 每个section时间、摘要和主题
        summary_total: 全文摘要
        first_summary：全文摘要主题
      summary_bytheme: 按主题摘要

    """
    # 划分section

    section = ''
    sections = []
    tm_section = []
    tm_start = df.iloc[0].time
    for i in range(0, df.shape[0]):
        if i % 2 == 0 and i + 1 < df.shape[0]:
            section = section + df.dialogs[i] + df.dialogs[i + 1]

            if len(section) < section_len:  # 如果section累计对话字数小于500，继续合并下一轮对话
                continue
            else:
                tm_end = df.iloc[i + 1].time  # section end time
                sections.append(section)
                tm_section.append(tm_start + "--" + tm_end)
                section = ""
                tm_start = df.iloc[i + 2].time  # next section start time
    df_s = pd.DataFrame({"tm_section": tm_section, "dialogue_section": sections})

    # 生成section摘要

    summary = []
    for s in sections:
        prompt = "请对下面这句话用中文进行摘要:" + s + "生成摘要:"
        response, history = model.chat(tokenizer, prompt, history=[])
        summary.append(response)

    df_s["section_summary"] = summary

    # 将section摘要合并后，对每part_len个字符生成摘要

    text = ""
    part = []
    for i in summary:
        text = text + i
    for i in range(len(text) // part_len):
        part.append(text[i * part_len:(i + 1) * part_len])

    summary_total = ""
    for p in part:
        prompt = "请对下面这句话用中文进行摘要:" + p + "生成摘要:"
        response, _ = model.chat(tokenizer, prompt, history=[])
        summary_total += response

    # 提取全文主题
    prompt = "请对下面这句话用list格式例举提取的主题词:" + summary_total
    response, _ = model.chat(tokenizer, prompt, history=[])
    first_summary = response
    print(first_summary)

    # 生成分主题词的摘要
    summary_bytheme = []
    for l in first_summary.split("\n"):
        print(l)
        prompt = "请提取原文{}中描述{}的部分:".format(summary_total, l[l.find(".") + 1:])
        response, _ = model.chat(tokenizer, prompt, history=[])
        summary_bytheme.append(l)
        summary_bytheme.append(response)
        print(response)
        print("\n")

    return df_s, summary_total, summary_bytheme, first_summary


if __name__ == '__main__':
    for part_len in [1000, 1200, 1500]:
        for write_mode in ["short", "long"]:
            # 获取transcript list
            summaryKey = "{}_summary_{}".format(write_mode, part_len)
            params = {"key": "原始文字", "excludeTranscriptsWithKey": summaryKey}
            data = get_list(url_get, headers_get, params)  ##transcriptId,summary
            # print (data)

            # 摘要生成
            for d in data:

                transid = d["transcriptId"]  # transciptId
                txt = d["summary"].split('\n')  # 原始文本

                # 识别人名,最多识别20个人名，用ABCDE表示
                name = set()
                for t in txt[:1000]:
                    if len(t.strip()) > 0:
                        name.add(t[:t.find("(")].strip())
                name = list(name)

                # 人名dict
                person = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S",
                          "T"]  # 20
                person_dict = {}
                for i in range(len(name)):
                    person_dict[name[i]] = person[i]
                print(person_dict)

                # 摘要处理
                # section_len = 500
                df = preprocess(txt, name, person_dict)

                for section_len in [500]:
                    df_s, summary_total, summary_bytheme, first_summary = section_summarize(df, section_len, part_len)
                    if write_mode == "short":
                        result_summary = "\n文本摘要:\n" + "\n".join(summary_bytheme)
                    else:
                        result_summary = "讨论的主题:\n{}\n".format(first_summary) + "\n文本摘要:\n" + summary_total

                    for n in name:  # 替换原始人名
                        result_summary = re.sub(person_dict[n], "{{" + n + "}}", result_summary)
                    # 上传摘要
                    post_summary(url_post, headers_post, transid, summaryKey, result_summary)
                    print("{} with {} is done".format(transid, summaryKey))
