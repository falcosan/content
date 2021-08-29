async function load() {
    const data = await (await fetch('_data.json')).json();
    const container = document.createElement("div");
    container.innerHTML = JSON.stringify(data)
    console.log(data)
    document.getElementsByTagName('body')[0].appendChild(container)
}