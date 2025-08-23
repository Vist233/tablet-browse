// 测试脚本 - 验证 importScript 是否真的不存在
console.log('Testing for importScript function...');

if (typeof importScript === 'function') {
    console.error('ERROR: importScript function still exists!');
    console.log('This indicates cached version is being used');
} else {
    console.log('✓ importScript function not found - good!');
    console.log('✓ Current line 324 content:', 
        `"${(typeof document !== 'undefined' && document.currentScript ? document.currentScript.text.split('\n')[323] : '无法获取')}"`);
}

console.log('To fix caching issue:');
console.log('1. Go to chrome://extensions/');
console.log('2. Remove the extension completely');
console.log('3. Click "Load unpacked" and reselect the folder');
console.log('4. Refresh the problematic website');