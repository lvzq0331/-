// 管理员账号恢复工具
// 在浏览器控制台运行此代码来恢复admin账号

const STORAGE_KEYS = {
  USER: 'mqb_users',
  PASSWORDS: 'mqb_passwords',
};

// 读取所有用户
let users = [];
try {
  const raw = localStorage.getItem(STORAGE_KEYS.USER);
  users = raw ? JSON.parse(raw) : [];
} catch (e) {
  users = [];
}

console.log('当前用户列表:', users);

// 检查是否有admin
const adminExists = users.some((u: any) => u.username === 'admin');

if (adminExists) {
  alert('admin账号已存在！请尝试重置密码。');
} else {
  // 创建admin账号
  const adminId = 'admin-' + Date.now();
  const newAdmin = {
    id: adminId,
    username: 'admin',
    displayName: '管理员',
    school: '',
    role: 'admin',
    createdAt: new Date().toISOString(),
  };
  
  users.push(newAdmin);
  localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(users));
  
  // 保存密码
  const pwds = JSON.parse(localStorage.getItem(STORAGE_KEYS.PASSWORDS) || '{}');
  pwds[adminId] = 'admin';
  localStorage.setItem(STORAGE_KEYS.PASSWORDS, JSON.stringify(pwds));
  
  alert('admin账号已创建！\n用户名: admin\n密码: admin\n请刷新页面后登录。');
  console.log('admin账号已创建', newAdmin);
}

// 列出所有用户
console.log('所有用户:', JSON.parse(localStorage.getItem(STORAGE_KEYS.USER) || '[]'));
