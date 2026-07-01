// 数据修复脚本 - 在浏览器控制台运行此脚本
// 此脚本会修复用户数据损坏的问题

console.log('开始修复用户数据...');

// 1. 备份现有数据（如果有）
const oldUsers = localStorage.getItem('mqb_users');
const oldCurrentUser = localStorage.getItem('mqb_user');
const oldPasswords = localStorage.getItem('mqb_passwords');

console.log('现有用户数据:', oldUsers);
console.log('当前用户:', oldCurrentUser);

// 2. 清除所有损坏的数据
localStorage.removeItem('mqb_users');
localStorage.removeItem('mqb_user');
localStorage.removeItem('mqb_passwords');

// 3. 创建admin账号
const adminId = 'admin-default';
const admin = {
  id: adminId,
  username: 'admin',
  displayName: '管理员',
  school: '',
  role: 'admin',
  createdAt: new Date().toISOString()
};

// 保存到 mqb_users（所有用户）
localStorage.setItem('mqb_users', JSON.stringify([admin]));

// 保存密码
localStorage.setItem('mqb_passwords', JSON.stringify({ [adminId]: 'admin' }));

// 4. 验证
const verifyUsers = JSON.parse(localStorage.getItem('mqb_users') || '[]');
console.log('修复后的用户数据:', verifyUsers);
console.log('✅ 修复完成！');
console.log('');
console.log('请刷新页面，然后使用以下账号登录：');
console.log('  用户名: admin');
console.log('  密码: admin');

// 5. 自动刷新页面
if (confirm('数据已修复！是否立即刷新页面？')) {
  location.reload();
}
