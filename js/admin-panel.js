/**
 * 管理面板 - 点击导航栏标题旁的小齿轮图标打开（需密码验证）
 * 支持添加/编辑/删除作品
 */
(function() {
    'use strict';

    const STORAGE_KEY = 'hermes_works_data';
    const ADMIN_PASSWORD='123456';

    let editingWorkId = null;

    function getWorks() {
        try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
        catch(e) { return []; }
    }

    function saveWorks(works) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(works));
    }

    // ====== 密码验证弹窗 ======
    let passwordVerified = false;

    function showPasswordPrompt(callback) {
        if (passwordVerified) {
            callback();
            return;
        }

        const overlay = document.createElement('div');
        overlay.id = 'hermes-pw-overlay';
        Object.assign(overlay.style, {
            display: 'flex',
            position: 'fixed', top: '0', left: '0', right: '0', bottom: '0',
            background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)',
            zIndex: '10001', alignItems: 'center', justifyContent: 'center'
        });

        const box = document.createElement('div');
        Object.assign(box.style, {
            background: '#fff', borderRadius: '20px', padding: '32px 28px 24px',
            width: '340px', maxWidth: '85vw', boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            textAlign: 'center', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        });

        box.innerHTML = [
            '<div style="font-size:2.2rem;margin-bottom:8px;">🔒</div>',
            '<h3 style="margin:0 0 4px;font-size:1.1rem;color:#333;font-weight:700;">请输入管理密码</h3>',
            '<p style="margin:0 0 18px;font-size:0.85rem;color:#999;">验证后即可管理作品</p>',
            '<input type="password" id="hermes-pw-input" placeholder="输入密码..."',
            '    style="width:100%;padding:12px 16px;border:2px solid #e0e0e0;border-radius:12px;font-size:1rem;outline:none;box-sizing:border-box;margin-bottom:14px;text-align:center;letter-spacing:3px;">',
            '<div style="display:flex;gap:10px;">',
            '    <button id="hermes-pw-cancel"',
            '        style="flex:1;padding:11px;border:1.5px solid #e0e0e0;border-radius:12px;background:#f8f8f8;color:#666;font-size:0.9rem;cursor:pointer;font-weight:500;">取消</button>',
            '    <button id="hermes-pw-confirm"',
            '        style="flex:1;padding:11px;border:none;border-radius:12px;background:linear-gradient(135deg,#7ec8c8,#a8edea);color:#fff;font-size:0.9rem;cursor:pointer;font-weight:600;">确认</button>',
            '</div>',
            '<div id="hermes-pw-error" style="color:#ef4444;font-size:0.8rem;margin-top:10px;display:none;">密码错误，请重试</div>',
            '</div>'
        ].join('\n');

        overlay.appendChild(box);
        document.body.appendChild(overlay);
        document.body.style.overflow = 'hidden';

        const input = document.getElementById('hermes-pw-input');
        const error = document.getElementById('hermes-pw-error');

        function doConfirm() {
            if (input.value === ADMIN_PASSWORD) {
                passwordVerified = true;
                overlay.remove();
                document.body.style.overflow = '';
                callback();
            } else {
                error.style.display = 'block';
                input.value = '';
                input.focus();
                input.style.borderColor = '#ef4444';
            }
        }

        document.getElementById('hermes-pw-confirm').onclick = doConfirm;
        document.getElementById('hermes-pw-cancel').onclick = function() {
            overlay.remove();
            document.body.style.overflow = '';
        };
        input.onkeydown = function(e) {
            if (e.key === 'Enter') doConfirm();
            if (e.key === 'Escape') {
                overlay.remove();
                document.body.style.overflow = '';
            }
        };
        input.onfocus = function() {
            error.style.display = 'none';
            this.style.borderColor = '#e0e0e0';
        };
        setTimeout(function() { input.focus(); }, 100);
    }

    // ====== 创建面板 UI ======
    function createPanel() {
        if (document.getElementById('hermes-admin-panel')) return;

        // 1. 齿轮图标
        const brandLogo = document.querySelector('.brand-logo');
        if (brandLogo) {
            const gearBtn = document.createElement('span');
            gearBtn.id = 'hermes-gear-btn';
            gearBtn.innerHTML = '\u2699\uFE0F';
            gearBtn.title = '\u7BA1\u7406\u4F5C\u54C1';
            Object.assign(gearBtn.style, {
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '26px',
                height: '26px',
                fontSize: '14px',
                cursor: 'pointer',
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.2)',
                marginLeft: '6px',
                opacity: '0.4',
                transition: 'opacity 0.2s, transform 0.2s',
                verticalAlign: 'middle',
                lineHeight: '26px'
            });
            gearBtn.onmouseenter = function() {
                this.style.opacity = '1';
                this.style.transform = 'rotate(30deg)';
            };
            gearBtn.onmouseleave = function() {
                this.style.opacity = '0.4';
                this.style.transform = 'rotate(0deg)';
            };
            gearBtn.onclick = function(e) {
                e.stopPropagation();
                showPasswordPrompt(function() {
                    openPanel();
                });
            };
            const link = brandLogo.querySelector('a');
            if (link) {
                link.parentNode.insertBefore(gearBtn, link.nextSibling);
            }
        }

        // 2. 面板 HTML
        const panel = document.createElement('div');
        panel.id = 'hermes-admin-panel';
        panel.innerHTML = [
            '<div class="hermes-overlay" id="hermes-overlay"></div>',
            '<div class="hermes-modal" id="hermes-modal">',
            '    <div class="hermes-modal-header">',
            '        <h3><i class="fas fa-tools"></i> \u4F5C\u54C1\u7BA1\u7406</h3>',
            '        <button class="hermes-close-btn" id="hermes-close-btn">&times;</button>',
            '    </div>',
            '    <div class="hermes-modal-body">',
            '        <div class="hermes-section">',
            '            <h4>\u5DF2\u6DFB\u52A0\u7684\u4F5C\u54C1</h4>',
            '            <div id="hermes-works-list"></div>',
            '        </div>',
            '        <div class="hermes-section">',
            '            <h4 id="hermes-form-title">\u6DFB\u52A0\u65B0\u4F5C\u54C1</h4>',
            '            <form id="hermes-add-form">',
            '                <div class="hermes-field">',
            '                    <label>\u4F5C\u54C1\u540D\u79F0 *</label>',
            '                    <input type="text" id="hermes-title" placeholder="如：英语口语练习平台" required>',
            '                </div>',
            '                <div class="hermes-field">',
            '                    <label>\u4F5C\u54C1\u63CF\u8FF0</label>',
            '                    <textarea id="hermes-desc" rows="3" placeholder="简单介绍这个作品..." style="resize:vertical;min-height:60px;"></textarea>',
            '                </div>',
            '                <div class="hermes-field">',
            '                    <label>\u5728\u7EBF\u94FE\u63A5</label>',
            '                    <input type="url" id="hermes-url" placeholder="https://...">',
            '                </div>',
            '                <div class="hermes-field">',
            '                    <label>\u6807\u7B7E\uFF08\u9017\u53F7\u5206\u9694\uFF09</label>',
            '                    <input type="text" id="hermes-tags" placeholder="如：教育技术, AI, 前端">',
            '                </div>',
            '                <div class="hermes-field">',
            '                    <label>\u5206\u7C7B</label>',
            '                    <input type="text" id="hermes-category" placeholder="如：技术">',
            '                </div>',
            '                <div class="hermes-form-actions">',
            '                    <button type="submit" class="hermes-submit-btn" id="hermes-submit-btn">',
            '                        <i class="fas fa-plus"></i> \u6DFB\u52A0\u4F5C\u54C1',
            '                    </button>',
            '                    <button type="button" class="hermes-cancel-edit-btn" id="hermes-cancel-edit" style="display:none;">',
            '                        <i class="fas fa-times"></i> \u53D6\u6D88\u7F16\u8F91',
            '                    </button>',
            '                </div>',
            '            </form>',
            '        </div>',
            '    </div>',
            '</div>'
        ].join('\n');
        document.body.appendChild(panel);

        // 3. CSS
        const ss = document.createElement('style');
        ss.textContent = [
            '.hermes-overlay{display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.4);-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px);z-index:9999}',
            '.hermes-overlay.active{display:block}',
            '.hermes-modal{display:none;position:fixed;top:50%;left:50%;-webkit-transform:translate(-50%,-50%);transform:translate(-50%,-50%);width:520px;max-width:92vw;max-height:85vh;overflow-y:auto;background:#fff;border-radius:20px;box-shadow:0 20px 60px rgba(0,0,0,0.2);z-index:10000;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,sans-serif}',
            '.hermes-modal.active{display:block}',
            '.hermes-modal-header{display:-webkit-box;display:-webkit-flex;display:-ms-flexbox;display:flex;-webkit-box-pack:justify;-webkit-justify-content:space-between;-ms-flex-pack:justify;justify-content:space-between;-webkit-align-items:center;-webkit-box-align:center;-ms-flex-align:center;align-items:center;padding:18px 24px;border-bottom:1px solid #f0f0f0;position:-webkit-sticky;position:sticky;top:0;background:#fff;border-radius:20px 20px 0 0;z-index:2}',
            '.hermes-modal-header h3{margin:0!important;font-size:1.15rem!important;color:#333!important;font-weight:700!important}',
            '.hermes-modal-header h3 i{color:#7ec8c8;margin-right:8px}',
            '.hermes-close-btn{background:none;border:none;font-size:1.5rem;color:#999;cursor:pointer;padding:0 4px;line-height:1}',
            '.hermes-close-btn:hover{color:#333}',
            '.hermes-modal-body{padding:20px 24px}',
            '.hermes-section{margin-bottom:20px}',
            '.hermes-section h4{font-size:0.95rem!important;color:#555!important;margin:0 0 12px!important;font-weight:600!important}',
            '.hermes-works-item{display:-webkit-box;display:-webkit-flex;display:-ms-flexbox;display:flex;-webkit-box-pack:justify;-webkit-justify-content:space-between;-ms-flex-pack:justify;justify-content:space-between;-webkit-align-items:center;-webkit-box-align:center;-ms-flex-align:center;align-items:center;padding:10px 14px;background:#f9f9f9;border-radius:10px;margin-bottom:8px;border:1px solid #eee;transition:border-color .2s}',
            '.hermes-works-item.editing{border-color:#7ec8c8;background:#f0fafa}',
            '.hermes-works-item-info{-webkit-box-flex:1;-webkit-flex:1;-ms-flex:1;flex:1;min-width:0}',
            '.hermes-works-item-info strong{display:block;font-size:.9rem;color:#333}',
            '.hermes-works-item-info span{font-size:.8rem;color:#999;display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
            '.hermes-works-item-actions{display:-webkit-box;display:-webkit-flex;display:-ms-flexbox;display:flex;gap:6px;-webkit-flex-shrink:0;-ms-flex-negative:0;flex-shrink:0}',
            '.hermes-edit-btn{background:#e0f2fe;border:none;color:#0284c7;width:30px;height:30px;border-radius:8px;cursor:pointer;font-size:.85rem;display:-webkit-inline-box;display:-webkit-inline-flex;display:-ms-inline-flexbox;display:inline-flex;-webkit-align-items:center;-webkit-box-align:center;-ms-flex-align:center;align-items:center;-webkit-box-pack:center;-webkit-justify-content:center;-ms-flex-pack:center;justify-content:center;transition:background .2s}',
            '.hermes-edit-btn:hover{background:#bae6fd}',
            '.hermes-del-btn{background:#fee2e2;border:none;color:#ef4444;width:30px;height:30px;border-radius:8px;cursor:pointer;font-size:.85rem;display:-webkit-inline-box;display:-webkit-inline-flex;display:-ms-inline-flexbox;display:inline-flex;-webkit-align-items:center;-webkit-box-align:center;-ms-flex-align:center;align-items:center;-webkit-box-pack:center;-webkit-justify-content:center;-ms-flex-pack:center;justify-content:center;transition:background .2s}',
            '.hermes-del-btn:hover{background:#fecaca}',
            '.hermes-empty{color:#ccc;font-size:.85rem;text-align:center;padding:20px 0}',
            '.hermes-field{margin-bottom:12px}',
            '.hermes-field label{display:block;font-size:.85rem;color:#666;margin-bottom:4px;font-weight:500}',
            '.hermes-field input,.hermes-field textarea{width:100%;padding:10px 14px;border:1.5px solid #e0e0e0;border-radius:10px;font-size:.9rem;outline:none;transition:border-color .2s;-webkit-box-sizing:border-box;box-sizing:border-box;background:#fafafa;font-family:inherit}',
            '.hermes-field input:focus,.hermes-field textarea:focus{border-color:#7ec8c8;background:#fff}',
            '.hermes-submit-btn{-webkit-box-flex:1;-webkit-flex:1;-ms-flex:1;flex:1;padding:12px;background:-webkit-linear-gradient(135deg,#7ec8c8,#a8edea);background:linear-gradient(135deg,#7ec8c8,#a8edea);border:none;border-radius:12px;color:#fff;font-size:.95rem;font-weight:600;cursor:pointer;transition:all .3s;margin-top:4px}',
            '.hermes-submit-btn:hover{-webkit-transform:translateY(-1px);-ms-transform:translateY(-1px);transform:translateY(-1px);box-shadow:0 4px 16px rgba(126,200,200,.3)}',
            '.hermes-cancel-edit-btn{padding:12px 18px;background:#f5f5f5;border:1.5px solid #e0e0e0;border-radius:12px;color:#666;font-size:.9rem;font-weight:500;cursor:pointer;transition:all .2s;margin-top:4px;white-space:nowrap}',
            '.hermes-cancel-edit-btn:hover{background:#eee;color:#333}',
            '.hermes-form-actions{display:-webkit-box;display:-webkit-flex;display:-ms-flexbox;display:flex;gap:8px;-webkit-align-items:center;-webkit-box-align:center;-ms-flex-align:center;align-items:center}',
            '.hermes-edit-badge{display:inline-block;font-size:.7rem;background:#7ec8c8;color:#fff;padding:0 8px;border-radius:4px;margin-left:6px;line-height:1.5}'
        ].join('');
        document.head.appendChild(ss);

        // 4. 事件绑定
        document.getElementById('hermes-close-btn').onclick = closePanel;
        document.getElementById('hermes-overlay').onclick = closePanel;
        document.onkeydown = function(e) { if (e.key === 'Escape') closePanel(); };
        document.getElementById('hermes-cancel-edit').onclick = resetForm;

        document.getElementById('hermes-add-form').onsubmit = function(e) {
            e.preventDefault();
            var title = document.getElementById('hermes-title').value.trim();
            if (!title) return;

            if (editingWorkId) {
                var works = getWorks();
                var idx = -1;
                for (var i = 0; i < works.length; i++) {
                    if (works[i].id === editingWorkId) { idx = i; break; }
                }
                if (idx !== -1) {
                    works[idx] = {
                        id: works[idx].id,
                        title: title,
                        description: document.getElementById('hermes-desc').value.trim(),
                        url: document.getElementById('hermes-url').value.trim(),
                        tags: document.getElementById('hermes-tags').value.split(',').map(function(t) { return t.trim(); }).filter(Boolean),
                        category: document.getElementById('hermes-category').value.trim(),
                        createdAt: works[idx].createdAt
                    };
                    saveWorks(works);
                    resetForm();
                    renderWorksList();
                    renderSiteWorks();
                    showToast('\u2705 \u5DF2\u4FDD\u5B58\u4FEE\u6539\uFF01\u5237\u65B0\u9875\u9762\u5373\u53EF\u770B\u5230');
                }
            } else {
                var works = getWorks();
                works.unshift({
                    id: Date.now().toString(36),
                    title: title,
                    description: document.getElementById('hermes-desc').value.trim(),
                    url: document.getElementById('hermes-url').value.trim(),
                    tags: document.getElementById('hermes-tags').value.split(',').map(function(t) { return t.trim(); }).filter(Boolean),
                    category: document.getElementById('hermes-category').value.trim(),
                    createdAt: new Date().toISOString().split('T')[0]
                });
                saveWorks(works);
                this.reset();
                renderWorksList();
                renderSiteWorks();
                showToast('\u2705 \u5DF2\u6DFB\u52A0\uFF01\u5237\u65B0\u9875\u9762\u5373\u53EF\u770B\u5230');
            }
        };

        function openEditForm(work) {
            editingWorkId = work.id;
            document.getElementById('hermes-title').value = work.title || '';
            document.getElementById('hermes-desc').value = work.description || '';
            document.getElementById('hermes-url').value = work.url || '';
            document.getElementById('hermes-tags').value = (work.tags || []).join(', ');
            document.getElementById('hermes-category').value = work.category || '';
            document.getElementById('hermes-form-title').textContent = '\u7F16\u8F91\u4F5C\u54C1';
            document.getElementById('hermes-submit-btn').innerHTML = '<i class="fas fa-save"></i> \u4FDD\u5B58\u4FEE\u6539';
            document.getElementById('hermes-cancel-edit').style.display = '';
            renderWorksList();
        }

        function resetForm() {
            editingWorkId = null;
            document.getElementById('hermes-add-form').reset();
            document.getElementById('hermes-form-title').textContent = '\u6DFB\u52A0\u65B0\u4F5C\u54C1';
            document.getElementById('hermes-submit-btn').innerHTML = '<i class="fas fa-plus"></i> \u6DFB\u52A0\u4F5C\u54C1';
            document.getElementById('hermes-cancel-edit').style.display = 'none';
            renderWorksList();
        }

        function openPanel() {
            document.getElementById('hermes-overlay').classList.add('active');
            document.getElementById('hermes-modal').classList.add('active');
            renderWorksList();
            document.body.style.overflow = 'hidden';
        }

        function closePanel() {
            document.getElementById('hermes-overlay').classList.remove('active');
            document.getElementById('hermes-modal').classList.remove('active');
            document.body.style.overflow = '';
        }

        function renderWorksList() {
            var container = document.getElementById('hermes-works-list');
            if (!container) return;
            var works = getWorks();
            if (works.length === 0) {
                container.innerHTML = '<div class="hermes-empty">\u8FD8\u6CA1\u6709\u6DFB\u52A0\u4F5C\u54C1\uFF0C\u586B\u8868\u5355\u6DFB\u52A0\u5427 \u2728</div>';
                return;
            }
            var html = '';
            for (var i = 0; i < works.length; i++) {
                var w = works[i];
                var isEditing = w.id === editingWorkId;
                html += '<div class="hermes-works-item' + (isEditing ? ' editing' : '') + '">';
                html += '<div class="hermes-works-item-info">';
                html += '<strong>' + escHtml(w.title) + (isEditing ? '<span class="hermes-edit-badge">\u7F16\u8F91\u4E2D</span>' : '') + '</strong>';
                html += '<span>' + (w.url ? escHtml(w.url) : '\u65E0\u94FE\u63A5') + ' \u00B7 ' + (w.createdAt || '') + '</span>';
                html += '</div>';
                html += '<div class="hermes-works-item-actions">';
                html += '<button class="hermes-edit-btn" data-id="' + w.id + '" title="\u7F16\u8F91"><i class="fas fa-pen"></i></button>';
                html += '<button class="hermes-del-btn" data-id="' + w.id + '" title="\u5220\u9664"><i class="fas fa-trash-alt"></i></button>';
                html += '</div></div>';
            }
            container.innerHTML = html;

            container.querySelectorAll('.hermes-edit-btn').forEach(function(btn) {
                btn.onclick = function() {
                    var works = getWorks();
                    for (var i = 0; i < works.length; i++) {
                        if (works[i].id === this.dataset.id) {
                            openEditForm(works[i]);
                            break;
                        }
                    }
                };
            });

            container.querySelectorAll('.hermes-del-btn').forEach(function(btn) {
                btn.onclick = function() {
                    var works = getWorks();
                    var filtered = [];
                    for (var i = 0; i < works.length; i++) {
                        if (works[i].id !== this.dataset.id) filtered.push(works[i]);
                    }
                    saveWorks(filtered);
                    if (editingWorkId === this.dataset.id) resetForm();
                    else renderWorksList();
                    renderSiteWorks();
                    showToast('\uD83D\uDDD1\uFE0F \u5DF2\u5220\u9664');
                };
            });
        }

        function renderSiteWorks() {
            var works = getWorks();
            document.querySelectorAll('.hermes-dynamic-card').forEach(function(el) { el.remove(); });
            if (works.length === 0) return;

            var targetRow = document.querySelector('#articles .row.article-row');
            if (!targetRow) return;

            for (var i = 0; i < works.length; i++) {
                var w = works[i];
                var tags = '';
                if (w.tags) {
                    for (var j = 0; j < w.tags.length; j++) {
                        tags += '<a href="/personal-blog/tags/' + encodeURIComponent(w.tags[j]) + '/"><span class="chip bg-color">' + escHtml(w.tags[j]) + '</span></a>';
                    }
                }
                var catLink = w.category ? '<a href="/personal-blog/categories/' + encodeURIComponent(w.category) + '/" class="post-category">' + escHtml(w.category) + '</a>' : '';
                var detailUrl = w.url || '#';
                var imgSrc = '/personal-blog/medias/banner/0.jpg';

                var div = document.createElement('div');
                div.className = 'article col s12 m6 l4 hermes-dynamic-card';
                div.innerHTML = '<div class="card"><a href="' + escHtml(detailUrl) + '"' + (w.url ? ' target="_blank"' : '') + '><div class="card-image"><img src="' + imgSrc + '" class="responsive-img" alt="' + escHtml(w.title) + '"><span class="card-title">' + escHtml(w.title) + '</span></div></a><div class="card-content article-content"><div class="summary block-with-text">' + escHtml(w.description || '\u6682\u65E0\u63CF\u8FF0') + '</div><div class="publish-info"><span class="publish-date"><i class="far fa-clock fa-fw icon-date"></i>' + (w.createdAt || '') + '</span><span class="publish-author">' + (catLink ? '<i class="fas fa-bookmark fa-fw icon-category"></i>' + catLink : '') + '</span></div></div><div class="card-action article-tags">' + tags + '</div></div>';
                targetRow.appendChild(div);
            }

            setTimeout(function() {
                document.querySelectorAll('.hermes-dynamic-card').forEach(function(el) {
                    el.style.position = '';
                    el.style.left = '';
                    el.style.top = '';
                    el.style.width = '';
                    el.style.transform = '';
                });
            }, 100);
        }

        function escHtml(s) { if (!s) return ''; var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

        function showToast(msg) {
            var old = document.querySelector('.hermes-toast');
            if (old) old.remove();
            var t = document.createElement('div');
            t.className = 'hermes-toast';
            t.textContent = msg;
            Object.assign(t.style, {
                position:'fixed', bottom:'30px', left:'50%', transform:'translateX(-50%)',
                background:'rgba(0,0,0,0.8)', color:'#fff', padding:'12px 24px',
                borderRadius:'12px', fontSize:'0.9rem', zIndex:'99999',
                backdropFilter:'blur(8px)', boxShadow:'0 4px 20px rgba(0,0,0,0.15)',
                animation:'hermesFadeIn 0.3s ease'
            });
            document.body.appendChild(t);
            setTimeout(function() { t.style.opacity='0'; t.style.transition='opacity 0.3s'; setTimeout(function(){t.remove();},300); }, 2500);
        }

        var as = document.createElement('style');
        as.textContent = '@keyframes hermesFadeIn { from{opacity:0;transform:translateX(-50%) translateY(10px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }';
        document.head.appendChild(as);

        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', renderSiteWorks);
        else renderSiteWorks();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', createPanel);
    else createPanel();
})();
