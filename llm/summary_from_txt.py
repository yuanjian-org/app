import math
import re
import pandas as pd

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


def read_from_txt(filename):
    file_content = None
    with open(filename, 'r', encoding="utf8") as reader:
        file_content = [line.rstrip() for line in reader.readlines() if line.strip()]
    return file_content


def process_names(original_texts):
    names = set()
    for text in original_texts:
        if len(text.strip()) > 0:
            names.add(text[:text.find("(")].strip())
    names = list(names)
    persons = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N",
               "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"]
    persons_dict = {}
    for i in range(len(names)):
        persons_dict[names[i]] = persons[i % len(persons)] * (math.floor(i / len(persons)) + 1)
    return names, persons_dict


def preprocess(original_texts, names, persons_dict):
    time = []
    txt = []
    for t in original_texts:
        time.append(t[t.find("("):t.find(")") + 1])
        flag = 0
        for n in names:
            if t[:t.find("(")].strip().find(n) >= 0:
                txt.append(re.sub(n + r'(\(.+\))', persons_dict[n], t.strip()))
                flag = 1
                break
        if flag == 0:
            print(t)
    df = pd.DataFrame({"dialogs": txt, "time": time})
    return df


def summarize_by_section(df, section_len):
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
    df_section = pd.DataFrame({"tm_section": tm_section, "dialogue_section": sections})

    summary_section = []
    for s in sections:
        prompt = "请对下面这句话用中文进行摘要:" + s + "生成摘要:"
        response, history = model.chat(tokenizer, prompt, history=[])
        summary_section.append(response)
    df_section["section_summary"] = summary_section
    print(df_section)
    print('\n')
    for section in sections:
        print(section)

    return summary_section


def summarize_by_all(summary, part_len):
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
    
    prompt = "请对下面这句话用list格式例举提取的主题词:" + summary_total
    response, _ = model.chat(tokenizer, prompt, history=[])
    first_summary = " "  # response
    print(first_summary)

    return summary_total, first_summary


def summarize_by_theme(summary_total, first_summary):
    summary_bytheme = []
    for l in first_summary.split("\n"):
        print(l)
        prompt = "请提取原文{}中描述{}的部分:".format(summary_total, l[l.find(".") + 1:])
        response, _ = model.chat(tokenizer, prompt, history=[])
        summary_bytheme.append(l)
        summary_bytheme.append(response)
        print(response)
        print("\n")

    return summary_bytheme


def section_summarize(df, section_len, part_len):
    summary_section = summarize_by_section(df, section_len)
    summary_total, first_summary = summarize_by_all(summary_section, part_len)
    summary_bytheme = summarize_by_theme(summary_total, first_summary)

    return summary_total, summary_bytheme, first_summary


def final_summaries_by_request(summary_total, summary_bytheme, first_summary, names, persons_dict):
    requests = ["One Sentence", "Short", "Median", "Long"]
    result_summary = ""
    result_summaries = dict()
    for request in requests:
        if request == "One Sentence":  # need to be more precise
            result_summary = ("关键主题" + "\n")
            for l in first_summary.split("\n"):
                result_summary += (l[l.find(".") + 1:] + ", ")

        elif request == "Short":
            result_summary = ("讨论的主题" + "\n") + first_summary

        elif request == "Median":
            result_summary = ("会议摘要" + "\n" + "\n")
            for i in range(len(summary_bytheme)):
                result_summary += (summarize_by_theme + "\n")
                if i % 2 == 1:
                    result_summary += "\n"
            for n in names:
                result_summary = re.sub(persons_dict[n], "{{" + n + "}}", result_summary)

        elif request == "Long":
            continue  # need to fix later after visializing the results
        
        result_summaries[request] = result_summary
    return result_summaries


if __name__ == '__main__':
    original_texts = read_from_txt("sample.txt")
    names, persons_dict = process_names(original_texts)
    df = preprocess(original_texts, names, persons_dict)
    print(df)
    section_len, part_len = 500, 1000
    summary_total, summary_bytheme, first_summary = section_summarize(df, section_len, part_len)
    result_summaries = final_summaries_by_request(summary_total, summary_bytheme, first_summary, names, persons_dict)
