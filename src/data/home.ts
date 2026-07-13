export const homeAssetPaths = [
  '/assets/hero-humanoid-ai-campus.png',
  '/assets/visual-v2/common-delivery.jpg',
  '/assets/visual-v2/higher-campus-students.jpg',
  '/assets/ai-factory.png',
  '/assets/embodied-intelligence.png',
  '/assets/higher-teaching.png',
  '/assets/k12-campus.png',
] as const;

export const factoryLayers = [
  ['应用层', '校园学伴、教师助手、安防研判、巡检运维、会议办公'],
  ['智能体层', '任务规划、多Agent协同、工具调用、记忆复盘、权限治理'],
  ['模型与知识层', '模型路由、RAG知识库、多模态理解、行业算法'],
  ['工程交付层', 'AI编程、插件工具、API网关、日志评估、私有化部署'],
] as const;

export const embodiedItems = [
  ['人形机器人', '展示交互、教学实训、复合任务和科研验证'],
  ['四足机器人', '楼宇、机房、园区与特殊空间智能巡检'],
  ['轮式服务平台', '空间导览、物资配送、信息发布与运维服务'],
  ['无人机与集群', '低空巡检、测绘建模、环境感知与空间数据回传'],
] as const;

export const technologyItems = [
  ['模型与知识工程', '公有、开源、本地模型适配，行业知识库与多模态算法集成。'],
  [
    'AI编程与软件开发',
    '从需求、原型、接口到测试与交付，建立面向场景的软件工程链路。',
  ],
  [
    '系统集成与设备接入',
    '连接校园、园区、会议、安防、机房和具身设备的真实运行环境。',
  ],
  [
    '私有化部署与运营',
    '围绕客户安全边界、权限、成本和运维要求，提供持续评估与优化。',
  ],
] as const;
