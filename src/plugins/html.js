export const htmlPlugin = () => ({
    name: "html-transform",
    transformIndexHtml: {
        enforce: "pre",
        transform(html) {
            return html;
        },
    },
});
