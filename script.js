function addTagToSearch(tag) {
  const searchInput = document.getElementById('search');
  searchInput.value = tag;
  searchInput.dispatchEvent(new Event('input'));
}

Promise.all([fetch('data.json').then(r => r.json())]).then(([entries]) => {
  const input = document.getElementById('search');
  const resultsDiv = document.getElementById('results');
  const noResultsDiv = document.getElementById('no-results-message');

  const highlightMatch = (text, query) => {
    if (!query) return text;
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  };  

  const scoreEntry = (item, query) => {
    query = query.toLowerCase();
    let score = 0;
  
    if (item.name.toLowerCase() === query) score += 100;
    else if (item.name.toLowerCase().includes(query)) score += 50;
  
    item.tags?.forEach((tag, index) => {
      const tagLower = tag.toLowerCase();
      if (tagLower === query) score += 20 - index;
      else if (tagLower.includes(query)) score += 10 - index;
    });
  
    if (item.description.toLowerCase().includes(query)) score += 2;
    if (item.coiner.toLowerCase().includes(query)) score += 15;
  
    item.altnames?.forEach((altname) => {
      const altnameLower = altname.toLowerCase();
      if (altnameLower === query) score += 40;
      else if (altnameLower.includes(query)) score += 20;
    });
  
    return score;
  };
  

  const renderEntry = (item) => {
    const query = input.value.trim().toLowerCase();
  
    return `
      <div class="entry">
        <h2><a href="${item.url}" target="_blank">${highlightMatch(item.name, query)}</a></h2>
        ${item.altnames && item.altnames.length ? `<p class="altnames">alternate names: ${highlightMatch(item.altnames.join(', '), query)}</p>` : ''}
        <p>${highlightMatch(item.description, query)}</p>
        <p>coined by ${highlightMatch(item.coiner, query)}</p>
        ${item.image ? `<div><img src="${item.image}"></div>` : ''}
        ${item.tags ? `<div class="tags">${item.tags.map(tag => `<span class="tag" onclick="addTagToSearch('${tag}')">${highlightMatch('#' + tag, query)}</span>`).join(' ')}</div>` : ''}
      </div>
    `;
  };
  

  const display = (filtered) => {
    if (filtered.length === 0) {
      resultsDiv.innerHTML = '';
      noResultsDiv.style.display = 'block';
    } else {
      resultsDiv.innerHTML = filtered.map(renderEntry).join('');
      noResultsDiv.style.display = 'none';
    }
  };

  input.addEventListener('input', () => {
    const query = input.value.trim().toLowerCase();
   
    if (!query) {
      display(entries);
      return;
    }

    const scoredEntries = entries
      .map(item => ({ item, score: scoreEntry(item, query) }))
      .filter(entry => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(entry => entry.item);
    display(scoredEntries);
  });
  display(entries);
});