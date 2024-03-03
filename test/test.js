
document.addEventListener('DOMContentLoaded', function () {
    // ブラウザの言語設定をHTMLのlang属性に設定
    document.documentElement.lang = navigator.language;

    const params = new URLSearchParams(window.location.search);
    const user = params.get('user');
    const theme = params.get('theme');
    const idsParam = params.get('ids');
    let ids;

    try {
        ids = JSON.parse(idsParam);
    } catch (e) {
        showError();
    }

    if (!user || !theme || !idsParam || !/^[a-zA-Z0-9_]+$/.test(user) || !/^[a-zA-Z]+$/.test(theme) || !Array.isArray(ids) || !ids.every(id => /^[0-9]+$/.test(id))) {
        showError();
    } else {
        const script = document.createElement('script');
        script.src = 'https://platform.twitter.com/widgets.js';
        script.async = true;
        document.head.appendChild(script);

        ids.forEach(function (id) {
            const link = `https://twitter.com/${user}/status/${id}`;
            const blockquote = document.createElement('blockquote');
            blockquote.className = 'twitter-tweet';
            blockquote.setAttribute('data-theme', theme);
            const a = document.createElement('a');
            a.href = link;
            blockquote.appendChild(a);
            document.body.appendChild(blockquote);
        });

        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeName === 'IFRAME' && node.id === 'rufous-sandbox') {
                        console.log('rufous-sandbox iframeが追加されました。');
                        const height = document.body.scrollHeight;
                        window.parent.postMessage({ iframeHeight: height }, '*');
                        observer.disconnect();
                    }
                });
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    function showError() {
        document.getElementById('error').style.display = 'block';
        window.stop();
    }
});