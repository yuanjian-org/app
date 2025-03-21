* 标题: 设计科学高效的师生匹配系统
* 作者: 王维汉
* 日期: 2024年10月

# 为什么需要匹配系统

为了帮助年轻人更好地成长，我们提出了社会导师制。作为对现有高等教育系统的有益补充，社会导师制通过一对一长期陪伴，帮助大学生们为步入社会做好准备，支持他们实现职业理想与社会责任。

社会导师是具有丰富职场和社会经历的"过来人"。他们在经过面试筛选后，与学生进行一对一匹配，开始长期陪伴。在定期交流中，他们首先和学生建立起犹如朋友般的亲近关系。在此关系的基础上，导师需要完成三项任务：一是关注学生的学习、生活和工作，帮助他们顺利度过校园时光并保持初心；二是引导学生的生涯规划，鼓励他们设立长期的职业和人生目标；三是围绕这些目标提供辅助，促进学生人格的塑造和综合素养的提升。

师生关系至关重要。这不仅是实现上述三个目标的基础，也直接影响参与者的内心感受。我们在实践中观察到，当学生匹配到合适的导师时，他们之间能自然而然地形成友谊，犹如水到渠成。许多导师和学生会一起阅读、互相督促锻炼，或者经常分享生活中的照片和视频。通过这些日常互动，[导师不知不觉地走进了学生的内心](https://mp.weixin.qq.com/s/ObKaRm7iluqK02fwy7QhXQ)。

然而，在实践社会导师制的初期，我们缺乏匹配师生的经验，匹配过程也比较随意。这种随意性导致了一些尴尬情况。例如，两位都比较沉默寡言的师生陷入无话可说的窘境；思维习惯的差异使师生难以找到深入交流的切入点；或者成长背景的差别导致导师难以与学生产生共鸣。这些情况都阻碍了师生关系的深入发展以及辅导目标的实现。

因此，我们借鉴前人的研究成果以及自身的实践经验，自主开发了一套师生匹配系统。经过多年的探索和迭代，这个系统日趋成熟。它显著提升了导师与学生之间的互动质量，也改善了中长期的辅导效果。与此同时，这个系统通过软件自动化技术，不仅大幅降低了人力成本，也在人力资源有限的情况下，能够支持较大规模的师生匹配需求。

值得一提的是，许多大中型企业也设有企业导师或职业教练项目来帮助员工发展。这些项目通常让员工自行选择导师，匹配流程相对松散。这个现象的原因在于员工寻求的辅导目标往往很明确，效果也易于衡量，因此员工能凭借个人判断找到合适的导师或教练。相比之下，社会导师具有更强的引导性和启发性，而且辅助目标因人而异，故不能完全依赖学生自身的经验和主观判断。此外，师生间的紧密关系对社会导师而言不可或缺，但对职业导师或教练则是锦上添花。因此，相较于企业项目，社会导师制对匹配质量有更高的要求。

# 设计原则

社会导师制的核心在于个性化，但个性化的系统往往难以标准化和规模化。这一矛盾不仅是大众化教育难以因材施教的主要原因，也是社会导师制面临的核心挑战。师生匹配系统是社会导师制的关键环节，也需要在这个矛盾中找到最佳平衡。具体而言，该系统必须同时满足三个条件：有效性、高效性和可扩展性。

**有效性**指每位学生能匹配到合适的导师。我们用两个指标衡量学生与导师之间的匹配质量：一是导师能否快速与学生建立友谊，二是导师的辅导特点是否能满足学生的成长需求。对于第一个指标，我们完全依赖师生双方的主观感受。人际关系在本质上是主观的，因此从理论角度来看，我们在这里采用现象学而非实证主义的评价方法 [Garvey & Stokes, 2022, p71] 对第一个指标进行衡量。现象学将主观经验视为事物的本质，而实证主义则更强调验证客观的因果关系。

对于第二个指标——导师的特点是否能满足学生的成长需求，我们依据面试阶段获取的信息进行评估。我们会对每位社会导师候选人和学生进行多维度的面试评估。面试结束后，面试官会记录导师的个性与辅导特点，以及学生的成长需求。这些信息为师生匹配提供了关键依据。举例来说，如果一位导师在"知识储备"维度上表现出知识面广泛且善于思考的特质，那么他对思维能力较弱的学生将特别有帮助。

**高效性**指事半功倍。有效性和高效性是两个相互矛盾的目标。例如，为了让学生充分了解导师，最有效的方法是让每一位学生依次与所有导师一对一交流。然而，这种方法过于耗时费力。相反，过分强调高效性又可能使过程变得机械和形式化，难以顾及学生的主观感受和个体差异。在下文描述的设计中，我们充分考虑了有效性和高效性之间的平衡。

**可扩展性**是指随着学生和导师数量的增加，匹配所耗时间应该线性增长，而非呈指数增长。如果不对系统进行优化，匹配耗时会随着人数增长而急剧上升。例如，匹配10名学生和10名导师需考虑100对潜在匹配，而匹配30名学生和30名导师则需考虑900对潜在匹配。

为了降低总耗时，我们设计的系统允许多位匹配人员同时独立工作，尽可能减少他们之间的协调需求。此外，我们通过软件自动化提高了匹配效率和准确度，显著降低了人力成本。

# 匹配流程

下图展示了师生匹配系统的完整流程：

<img src="/articles/match/workflow.png" alt="匹配流程" width="500px">

我们来解释一下图中标出的每一个步骤：

**步骤（1）**：首先，导师候选人必须通过面试，符合社会导师的标准，才能成为正式的社会导师。面试还有一个重要作用，就是从多个维度评估导师的个性特点，为他们"画像"。这包括评估导师的性格是偏外向还是内向、更倾向于表达还是倾听、更擅长与高年级或低年级学生交流、思维习惯和心态开放的程度等等。

**步骤（2）**：学生面试的目的主要在于“画像”而不在于选拔，尽管某些社会导师制的实践也通过面试限制学生数量。学生的评估维度与导师面试类似但不同，比如它更侧重于学生的未来发展潜力以及辅导需求。具体维度的设计与社会导师制的具体实现相关，实现的目的不同，维度设计也会有所差异。由于篇幅限制，此处不再详细展开。

**步骤（3）**：面试通过后，导师们上传个人资料，包括生活照、简历、辅导特长和生活趣事等。除此之外，他们还要提供匹配偏好。例如，一些女性导师仅希望辅导女学生，来自农村的导师可能倾向于帮助相似背景的学生，具有中学教育经验的导师则可能更希望辅导低年级的学生，等等。

**步骤（4）**：学生浏览所有导师的基本信息后，需填写《学生意向》表。这份表格旨在收集学生对导师的初步印象和偏好。它包含以下几个问题：

- "最希望匹配的导师和希望匹配的原因"。要求学生阐述原因能促使他们进行理性分析，而不仅仅依赖直觉或导师照片带来的第一印象。这些原因也为匹配过程提供了重要参考。例如，如果学生表示希望匹配的原因是导师与他来自同一个县城，那么他们更可能因为"老乡见老乡"的亲近感而快速建立友谊。然而，如果原因仅仅是某位导师事业非常成功，这并不一定意味着匹配合适。
- “其次希望匹配的导师和原因”
- “再次希望匹配的导师和原因”
- “第四位希望匹配的导师”。第四和第五位导师主要用作备选，因此提供原因的意义不大。
- “第五位希望匹配的导师”
- “其他希望匹配的导师（可多选）”
- “希望避免的导师（可多选）“。匹配算法将尽量避免匹配他们。

**步骤（5）**：初配算法是一套人机结合的半自动流程。它将步骤（1）到（4）收集的数据作为输入，生成初始匹配名单。这个名单为每位学生配置最少M位、最多N位导师进行初步交流。M和N是可调节的参数。我们将在下一节详细介绍这个算法。

**步骤（6）**：安排学生与匹配的导师进行一对一远程视频沟通，每次时长30至45分钟。这次沟通旨在帮助双方建立初步印象，并让学生思考每位导师对其未来发展的潜在影响。我们在发给学生的通知模板中详细阐述了这一安排：

> **学生通知模板**
>
>【关于导师的称谓】我们希望你与导师建立一种朋友般的关系，而非传统的师生或长辈关系。因此，称呼导师时可以随意一些。可以直呼其名，或者用昵称、“哥”、“姐”等亲切的方式。
>
>【关于与导师的对话内容】我们鼓励你主动提出感兴趣的问题，展开深入讨论。以下是一些参考话题：
>
> 1. 建立关系：增进彼此了解，培养默契。你可以问：
>    * 请导师分享日常的工作生活、兴趣爱好或特长。
>    * 询问导师近期遇到的挑战或困惑。
>
> 2. 长期陪伴：导师将是你人生的一部分，因此彼此性格的契合度很重要。你可以问：
>    * 请导师简单总结一下自己的性格特点。
>    * 请导师分享两项优点和一项弱点。
>    * 询问导师在什么情况下会生气或变得严厉。
>
> 3. 共塑目标：导师能够帮助你实现职业或人生目标。你可以问：
>    * 导师在哪些领域擅长辅导？
>    * 提出一个自己希望达成的目标，询问导师如何帮助你实现。
>
> 4. 共同成长：导师可以陪伴你在人生旅途中一起成长。你可以问：
>    * 请导师分享一些自己成长的故事或重要的转折时刻。
>    * 询问导师是否有一些人生信条？如果有，是什么？为什么对他/她重要？
>
>【关于导师对你的意义】我们希望导师能够像蝴蝶的翅膀一样，带来积极的改变并对你的人生产生深远的影响。因此，请思考导师的品质在长期陪伴过程中，以及在五年、十年之后，将如何对你产生深刻的意义和帮助。

我们鼓励学生在交流中积极主动，并建议导师让学生引导谈话内容，自己则主要回答学生的问题。通过这种方式，我们希望能激励学生的主观能动性——这是许多中国学生普遍缺乏的品质。师生的首次互动为正向影响学生提供了很好的机会。

**步骤（7）**：在交流过后，学生用《导师反馈》表对每位交流过的导师打分。表格说明如下："请综合考虑各项因素，如交流感受、背景匹配程度、导师经历对你人生的启发等，给予1至5分的评分。1分表示最不希望匹配，5分表示最希望匹配。同时请提供简要解释。"

**步骤（8）**：类似地，导师要填写《学生反馈》表，但不需要给学生打分，只需回答两个问题：

- “你特别喜欢的学生，可多选。鼓励提供主观或客观原因”
- “你希望避免的学生，可多选”

我们不要求导师为学生打分是因为学生选导师往往比导师选学生更挑剔。正如 [Garvey & Stokes, 2022, p73] 所说：“学生通常对与谁合作十分挑剔，并且在一开始就非常明确地指出他们的导师应该具备哪些成就，以及希望导师从事什么样的行业。相反，导师们则愿意与来自任何背景的学生合作。“ 有意思的是，文中也指出：“在实际操作中，即使学生被匹配到的导师不符合他们的预期，他们仍发现这种关系对自己很有帮助。从这个角度来看，学生对自己的需求很清楚，但对预期条件的重要性有所误判。”

**步骤（9）**：定配算法以步骤（7）和（8）收集的数据为输入，生成最终匹配结果（10）。我们将在下文详细介绍这个算法。在最终结果中，每位学生只会匹配一位导师，而每位导师可能匹配多位学生。导师们会根据自身精力指定他们最多可以辅导的学生数量。定配算法确保不会超出这个限制。

# 初配算法

初配算法使用步骤（1）至（4）收集的信息，通过一系列人机结合的半自动化步骤，生成用于初次交流的师生匹配名单。在这个算法中，自动化软件首先为每位学生生成一份数据报表。下图展示了"学生甲"的报表示例。其中，两个红色的字段需由匹配人员手动填写，而其他字段则是自动导入的信息：

![初配表](/articles/match/initial.png)

在表格上部，"导师需注意"、"学生对导师的期待"和面试维度的评分等字段都是面试官在面试学生时记录的信息。我们要求面试官针对每个面试维度从 1 到 5 打分。1 至 5 分别代表"明显低于预期"、"低于预期"、"达到预期"、"高于预期"和"明显高于预期"。换言之，3分代表了平均水平。我们还要求面试官填写每个维度的文字评价。但是为了便于匹配人员快速评估，报表忽略了文字部分。

在表格下部，“学生偏好度”字段是根据当前学生在《学生意向》表中的答案自动计算出来的：

<style>
  table.pref th, table.pref td {
    border: 1px solid black;
    padding: 8px;
    text-align: center;
    font-size: 12pt;
  }
  table.pref th {
    font-weight: bold;
    width: 50%;
  }
</style>

<table class="pref">
  <thead>
    <tr>
      <th>导师在《学生意向》表的位置</th>
      <th>对应的“学生偏好度”数值</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>最希望匹配</td>
      <td>5</td>
    </tr>
    <tr>
      <td>其次希望匹配</td>
      <td>4</td>
    </tr>
    <tr>
      <td>再次希望匹配</td>
      <td>3</td>
    </tr>
    <tr>
      <td>更多希望匹配</td>
      <td>2</td>
    </tr>
    <tr>
      <td>希望避免</td>
      <td>-4</td>
    </tr>
    <tr>
      <td>未出现在《学生意向》表</td>
      <td>0</td>
    </tr>
  </tbody>
</table>

自动报表准备就绪以后，匹配人员将根据表中信息手动填写"匹配度"字段。为了便于后续的自动化处理，我们将匹配度量化为一个介于 -5 至 5 之间的整数（下文提到的求解程序只能处理整数）。匹配人员按以下步骤计算该数值，一旦匹配度达到上限或下限，计算即停止：

<style>
  table.rating {
    width: 100%;
    border-collapse: collapse;
  }
  table.rating th, table.rating td {
    border: 1px solid black;
    padding: 8px;
    text-align: left;
    font-size: 12pt;
  }
  table.rating th:nth-child(1), table.rating td:nth-child(1) { width: 10%; }
  table.rating th:nth-child(2), table.rating td:nth-child(2) { width: 60%; }
  table.rating th:nth-child(3), table.rating td:nth-child(3) { width: 30%; }
</style>

<table class="rating">
  <thead>
    <tr>
      <th><b>步骤</b></th>
      <th><b>如果…</b></th>
      <th><b>则把匹配度…</b></th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>1</td>
      <td>不满足导师的硬性偏好（比如只愿辅导女性学生）</td>
      <td>设为 -5</td>
    </tr>
    <tr>
      <td>2</td>
      <td>不满足导师软性偏好（比如希望辅导农村学生）</td>
      <td>减 1 至 5 分</td>
    </tr>
    <tr>
      <td>3</td>
      <td>导师在以下领域有辅导特长：学生面试维度的低分项”、导师需注意“、”学生对未来导师的期待“</td>
      <td>每个特长加 1 分</td>
    </tr>
    <tr>
      <td>4</td>
      <td>导师的某些维度符合学生的背景或个性（比如善于忘年之交的导师适合年龄差距大的学生）</td>
      <td>加 1 到 3 分</td>
    </tr>
    <tr>
      <td>5</td>
      <td>师生在某些方面相似（比如性格、爱好、职业、学术经历、成长环境、生活背景等）</td>
      <td>每个相似点加 1 分</td>
    </tr>
    <tr>
      <td>6</td>
      <td>师生在其他某些方面互补</td>
      <td>每个互补点加 1 分，最多 3 分</td>
    </tr>
  </tbody>
</table>

关于最后两步，我们之所以把相似性和互补性均视为加分项，是因为我们认为二者都能促进师生关系的形成。正如 [Garvey & Stokes, 2022, p76] 所说：“确保两方面的平衡至关重要：一方面，需要有足够的差异性来创造价值；另一方面，也需要有足够的相似性来建立融洽关系。“此外，互补性还能够为学生提供新的视角。我们的实践经验表明，导师特有的个人经历常常能引起学生的好奇，使他们更渴望了解这些经历背后的故事。这无疑有助于增进师生关系并拓展学生的视野。

然而，相较于互补性，相似性更能促进社交关系的形成。因此，我们首先考察相似性，然后才考虑师生在其他方面是否互补。我们还将互补性的加分限制在三分以下。

我们设计如此细致的流程，旨在尽可能减少主观因素引起的误差。然而，当待匹配的学生数量较多时，这个流程不仅耗时，还会给匹配人员带来较大负担。为解决这一问题，我们可以采用多人并行工作的方式，让每位匹配人员负责一部分学生。由于匹配度计算相互独立——即任何一对师生的匹配度计算不受其他配对的影响——匹配人员可以独立完成任务，无需互相协调。这种方法最大限度地支持并行工作，从而显著缩短计算时间。展望未来，我们希望应用人工智能大语言模型（LLM）自动计算匹配度，彻底替代人工流程。

在匹配人员完成匹配度打分后，我们会运行一个自动求解程序。该程序把匹配度打分作为输入信息，自动生成一份用于师生初次交流的匹配名单。它为每位导师匹配 M 至 N 名学生，为每名学生匹配 P 至 Q 位导师。M、N、P、Q 都是根据学生和导师的精力预先设定的参数。这些参数不仅控制师生的交流数量，还会影响定配算法（详见下节）的工作量——参数值越大，工作量越大。在实践中，我们通常把这些参数设置为 M = 2、N = 4、P = Q = 3。

自动求解程序采用业界标准的组合优化算法——谷歌的 CP-SAT 求解器。该算法能确保输出的方案是最优的。我们已将这个程序的源代码公开，感兴趣的读者可以访问 https://github.com/yuanjian-org/app/blob/main/tools/match.ipynb。

# 定配算法

在学生和导师完成初次交流（步骤6）并各自填写《学生反馈》和《导师反馈》表后，我们使用定配算法确定最终的匹配名单。为运行该算法，我们首先用软件将两个反馈表的数据自动导入到同一张报表，如下图所示。其中，"容量"列显示导师们在步骤（3）填写的最多可辅导学生数量。"学生X"列的数字代表学生在《学生反馈》表中给导师的打分，而"Y"和"N"分别代表导师在《导师反馈》表中标明的特别喜欢和希望避免的学生：

<img src="/articles/match/final0.png" alt="定配表" width="600px">

需要注意，不同学生对导师的打分标准可能存在差异。例如，一个学生给导师打 4 分可能表示不愿意匹配，而另一个学生打同样的分数却可能表示愿意匹配。为了消除这种标准差异，我们需要对分数进行标准化处理，将每个学生的分数统一扩展到 1 至 5 的区间。假设某位学生给三位导师打分是 4、4、5，则分值会被扩展成 1、1、5；若另一位学生的打分是 2、3、4，则会被扩展成 1、3、5。

最后，匹配人员根据表中的数据，手工确定最佳匹配方案。我们不难找出上图的最佳方案，并在下图中用蓝色方块标示。在这个方案中，“导师己”匹配到了两位学生，而“导师戊”没有匹配到任何学生：

<img src="/articles/match/final1.png" alt="定配表" width="600px">

由于定配算法涉及的数据量远少于初配算法，人工操作不会耗费太多时间。尽管如此，我们仍然计划在未来使用软件辅助求解。然而，人工参与仍有其独特优势。首先，当遇到棘手的决策问题时（如导师名额不足或师生反馈不一致），负责人可直接与双方沟通，灵活调整。其次，为了保证匹配质量，我们可以请多位负责人独立完成匹配，再对比结果。如有分歧，他们需深入考察导师和学生资料，充分讨论至达成共识。这种集体决策方法能有效减少个人偏见，展现了机器算法难以企及的优势。

**参考文献**

Garvey, R., and P. Stokes. *Coaching and Mentoring: Theory and Practice*. 4th ed. SAGE Publications Ltd, 2022.
