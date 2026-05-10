async function list() {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=AIzaSyCyEFG7lSNNH6kDz34zXg0ZpMnWZD-lD9M`);
  const data = await response.json();
  const names = data.models ? data.models.map(m => m.name) : [];
  console.log("Models:", names);
}
list();
