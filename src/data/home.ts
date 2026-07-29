export const homeAssetPaths = [
  '/assets/hero-humanoid-ai-campus.png',
  '/assets/visual-v2/common-delivery.jpg',
  '/assets/visual-v2/higher-campus-students.jpg',
  '/assets/ai-factory.png',
  '/assets/embodied-intelligence.png',
  '/assets/higher-teaching.png',
  '/assets/k12-campus.png',
] as const;

export const mobileCapabilities = [
  ['01', 'AI 应用工厂', '/guangtai-ai-factory'],
  ['02', '具身智能', '/solutions/common/embodied-intelligence'],
  ['03', '系统集成', '/solutions/common'],
  ['04', '行业场景', '/solutions/industries'],
] as const;

export const mobileDeliverySteps = [
  ['需求与场景定义', '明确目标、使用角色、既有系统与验收边界。'],
  ['平台与系统建设', '组合 AI、软件、设备与空间能力，完成实施联调。'],
  ['运营与持续优化', '以真实使用反馈持续评估、迭代和优化。'],
] as const;

export const mobileScenarioLinks = [
  ['AI 与具身智能', '/solutions/common/ai'],
  ['通用方案', '/solutions/common'],
  ['高校场景', '/solutions/industries/higher-education'],
  ['中小学场景', '/solutions/industries/k12'],
] as const;

export const projectTypes = [
  ['校园AI智能体', '知识库、教师助手、学习服务与管理流程智能体。'],
  [
    '具身智能实训与巡检',
    '人形、四足与轮式设备的任务编排、数据回传和运行管理。',
  ],
  [
    '智能空间与系统集成',
    '会议、报告、展示、安防、机房与业务系统的一体化建设。',
  ],
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
