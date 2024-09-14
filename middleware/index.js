const express = require('express');
const app = express();
const port = 8080;

let items = [];

app.use(express.json());

app.get('/items', (req, res) => {
	res.json(items);
});

app.post('/items', (req, res) => {
	const item = req.body;
	items.push(item);
	res.status(201).json(item);
});

app.get('/items/:id', (req, res) => {
	const item = items.find((i) => i.id === parseInt(req.params.id));
	if (item) {
		res.json(item);
	} else {
		res.status(404).send('Item not found');
	}
});

app.put('/items/:id', (req, res) => {
	const itemIndex = items.findIndex((i) => i.id === parseInt(req.params.id));
	if (itemIndex !== -1) {
		items[itemIndex] = req.body;
		res.json(items[itemIndex]);
	} else {
		res.status(404).send('Item not found');
	}
});

app.delete('/items/:id', (req, res) => {
	const itemIndex = items.findIndex((i) => i.id === parseInt(req.params.id));
	if (itemIndex !== -1) {
		items.splice(itemIndex, 1);
		res.status(204).send();
	} else {
		res.status(404).send('Item not found');
	}
});

app.listen(port, () => {
	console.log(`Server is running on http://localhost:${port}`);
});

