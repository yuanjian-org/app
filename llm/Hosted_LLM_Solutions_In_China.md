# 国内发布的语言模型 (与算法)


## 一、 文本LLM模型:

### 1. ChatGLM (目前使用):

Link: https://github.com/THUDM/ChatGLM-6B

发布者: 清华技术成果转化的公司 - 智谱AI

介绍: 中文领域效果最好的开源底座模型之一，针对中文问答和对话进行了优化。经过约 1T 标识符的中英双语训练，辅以监督微调、反馈自助、人类反馈强化学习等技术的加持。

开源模型: THUDM/chatglm-6b

注: 有好几个版本


### 2. Qwen-7B:

Link: https://github.com/QwenLM/Qwen

发布者: 阿里云

介绍: 通义千问-7B（Qwen-7B）是阿里云研发的通义千问大模型系列的70亿参数规模的模型，使用了超过2.2万亿token的自建大规模预训练数据集进行语言模型的预训练。
数据集包括文本和代码等多种数据类型，覆盖通用领域和专业领域，能支持8K的上下文长度，针对插件调用相关的对齐数据做了特定优化，当前模型能有效调用插件以及升级为Agent。

开源模型: Qwen/Qwen-7B-Chat


### 3. Skywork
Link: https://github.com/SkyworkAI/Skywork

发布者: 昆仑万维集团·天工团队

介绍: 该项目开源了天工系列模型，该系列模型在3.2TB高质量多语言和代码数据上进行预训练，开源了包括模型参数，训练数据，评估数据，评估方法。具体包括Base模型推理，Chat模型推理，Math模型推理等。

开源模型: SkyworkAI/Skywork-13B-Base


### 4. XVERSE-13B

Link: https://github.com/xverse-ai/XVERSE-13B

发布者: 深圳元象科技

介绍: 该模型是由深圳元象科技自主研发的支持多语言的大语言模型，使用主流Decoder-only的标准Transformer网络结构，支持8K的上下文长度（Context Length），构建了1.4万token的高质量、多样化的数据对模型进行充分训练; 
具体案例包括文本生成，言语理解，逻辑推理，知识问答，多语言能力等。

开源模型: xverse/XVERSE-13B-Chat


### 5. Chinese-LLaMA-Alpaca-2

Link: https://github.com/ymcui/Chinese-LLaMA-Alpaca-2

介绍: 中文LLaMA&Alpaca大语言模型+本地CPU/GPU部署，在原版LLaMA的基础上扩充了中文词表并使用了中文数据进行二次预训练，并基于可商用的LLaMA-2进行二次开发。

开源模型: 

（1）	基座模型: Chinese-LLaMA-2-1.3B, Chinese-LLaMA-2-7B, Chinese-LLaMA-2-13B

（2）	聊天模型: Chinese-Alpaca-2-1.3B, Chinese-Alpaca-2-7B, Chinese-Alpaca-2-13B

（3）	长上下文模型: Chinese-LLaMA-2-7B-16K, Chinese-LLaMA-2-13B-16K, Chinese-Alpaca-2-7B-16K, Chinese-Alpaca-2-13B-16K

注: 模型使用方式需要继续具体研究。


### 6. YuLan-Chat:
	
Link: https://github.com/RUC-GSAI/YuLan-Chat

发布者: 中国人民大学

介绍: 该模型是中国人民大学GSAI研究人员开发的基于聊天的大语言模型。它是在LLaMA的基础上微调开发的，具有高质量的中文指令。

开源模型: yulan-team/YuLan-Chat-2-13b


### 7. Baichuan-7B:

Link: https://github.com/baichuan-inc/baichuan-7B

发布者: 百川智能

介绍: Baichuan-13B是由百川智能开发的包含130亿参数的开源可商用的大规模语言模型，在权威的中文benchmark上取得同尺寸最好的效果。

开源模型: baichuan-inc/Baichuan-7B


### 8. 书生·浦语:

Link: https://github.com/InternLM/InternLM-techreport

介绍: 书生·浦语是由商汤科技、上海AI实验室联合香港中文大学、复旦大学和上海交通大学发布的千亿级参数大语言模型，具有1040亿参数，基于“包含1.6万亿token的多语种高质量数据集”训练而成。

模型暂未开源，API公布时间未知



## 二、 垂直教育领域模型:

### 9. EduChat:

Link: https://github.com/icalk-nlp/EduChat

发布者: 华东师范大学

介绍: 该项目华东师范大学计算机科学与技术学院EduNL团队研发，主要研究以预训练大模型为基底的教育对话大模型相关技术，融合多样化的教育垂直领域数据，辅以指令微调、价值观对齐等方法，
提供教育场景下自动出题、作业批改、情感支持、课程辅导、高考咨询等丰富功能，服务于广大老师、学生和家长群体。

开源模型: ecnu-icalk/educhat-sft-002-7b



## 三、 横向文本摘要算法:

### 10. TextRank4ZH:

Link: https://github.com/letiantian/TextRank4ZH

介绍: TextRank是一种用于文本摘要和关键词提取的算法，由谷歌搜索的核心网页排序算法PageRank改编而来，它使用图模型来分析文本中的句子之间的关联度，并根据关联度对句子进行排序。TextRank4ZH是TextRank的一个针对中文文本的实现。

API: 直接调用源码中不同类的方法。

