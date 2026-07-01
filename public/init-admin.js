// 初始化管理员账号脚本
// 在浏览器控制台运行此脚本，或访问 /init-admin 页面

(function initAdmin() {
  const STORAGE_KEYS = {
    USER: 'mqb_users',
    QUESTIONS: 'mqb_questions',
    TAGS: 'mqb_tags',
    EXAMS: 'mqb_exam_papers',
  };

  // 检查是否已有admin账号
  const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USER) || '[]');
  const admin = users.find((u: any) => u.username === 'admin');

  if (admin) {
    alert('管理员账号已存在！\n用户名: admin\nID: ' + admin.id);
    return;
  }

  // 创建admin账号
  const adminId = 'admin-' + Date.now();
  const newAdmin = {
    id: adminId,
    username: 'admin',
    displayName: '管理员',
    school: '默认学校',
    role: 'admin',
    createdAt: new Date().toISOString(),
  };

  users.push(newAdmin);
  localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(users));

  // 保存密码
  const pwds = JSON.parse(localStorage.getItem('mqb_passwords') || '{}');
  pwds[adminId] = 'admin';
  localStorage.setItem('mqb_passwords', JSON.stringify(pwds));

  alert('管理员账号创建成功！\n用户名: admin\n密码: admin\n请重新登录。');
  
  // 自动跳转到登录页
  window.location.href = '/';
})();
