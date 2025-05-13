let coinerData = {};

function addTagToSearch(tag) {
  const searchInput = document.getElementById('search');
  searchInput.value = tag;
  searchInput.dispatchEvent(new Event('input'));
}

document.getElementById('toggle-filters').addEventListener('click', () => {
  const filters = document.getElementById('advanced-filters');
  const toggle = document.getElementById('toggle-filters');
  if (filters.style.display === 'none') {
    filters.style.display = 'block';
    toggle.textContent = '▲ search filters';
  } else {
    filters.style.display = 'none';
    toggle.textContent = '▼ search filters';
  }
});

Promise.all([
  fetch('data.json').then(r => r.json()),
  fetch('coiners.json').then(r => r.json())
]).then(([entries, coiners]) => {
  coinerData = coiners;

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
        ${item.altnames?.length ? `<p class="altnames">alternate names: ${highlightMatch(item.altnames.join(', '), query)}</p>` : ''}
        <p>${highlightMatch(item.description, query)}</p>
        <p>
          coined by 
          <span class="coiner-name" data-coiner="${item.coiner}">
            ${highlightMatch(item.coiner, query)}
          </span>
        </p>
        ${item.image ? `<div><img loading="lazy" src="${item.image}"></div>` : ''}
        ${item.tags ? `<div class="tags">${item.tags.map(tag => `<span class="tag" onclick="addTagToSearch('${tag}')">${highlightMatch('#' + tag, query)}</span>`).join(' ')}</div>` : ''}
      </div>
    `;
  };

  document.getElementById('random-button').addEventListener('click', () => {
    const randomEntry = entries[Math.floor(Math.random() * entries.length)];
    input.value = randomEntry.name;
    input.dispatchEvent(new Event('input'));
  });

  const coinerPopup = document.createElement('div');
  coinerPopup.id = 'coiner-popup';
  coinerPopup.className = 'coiner-popup';
  coinerPopup.style.display = 'none';
  coinerPopup.style.position = 'absolute';
  coinerPopup.style.zIndex = '1000';
  document.body.appendChild(coinerPopup);

  let activePopupTarget = null;

  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('coiner-name')) {
      const id = e.target.dataset.coiner;
      const data = coinerData[id];
      if (!data) return;

      const pronouns = data.pronouns? `<p><div class="labels">PRONOUNS</div>${data.pronouns}</p>` : '';
      const blurb = data.blurb? `<p><div class="labels">BLURB</div>${data.blurb}</p>` : '';
      const links = data.links?.length? `<div class="labels">LINKS</div>` + data.links.map(link => `<a href="${link.url}" target="_blank">${link.platform}</a>`).join('<br>') : '';

      coinerPopup.innerHTML = `
        <h3>${data.name || id}</h3>
        ${pronouns}
        ${blurb}
        ${links}
      `;

      const rect = e.target.getBoundingClientRect();
      coinerPopup.style.top = `${rect.bottom + window.scrollY + 5}px`;
      coinerPopup.style.left = `${rect.left + window.scrollX}px`;
      coinerPopup.style.display = 'block';
      activePopupTarget = e.target;
    } else if (!coinerPopup.contains(e.target)) {
      coinerPopup.style.display = 'none';
      activePopupTarget = null;
    }
  });

  window.addEventListener('scroll', () => {
    coinerPopup.style.display = 'none';
    activePopupTarget = null;
  });

  const display = (filtered) => {
    if (filtered.length === 0) {
      resultsDiv.innerHTML = '';
      noResultsDiv.style.display = 'block';
    } else {
      resultsDiv.innerHTML = filtered.map(renderEntry).join('');
      noResultsDiv.style.display = 'none';
    }
  };

  const runSearch = () => {
    const query = input.value.trim().toLowerCase();
    const nameFilter = document.getElementById('filter-name').value.trim().toLowerCase();
    const coinerFilter = document.getElementById('filter-coiner').value.trim().toLowerCase();
    const tagsFilter = document.getElementById('filter-tags').value.trim().toLowerCase().split(',').map(t => t.trim()).filter(Boolean);
    const descFilter = document.getElementById('filter-description').value.trim().toLowerCase();

    const filtered = entries.filter(item => {
      const score = scoreEntry(item, query);
      if (query && score === 0) return false;

      if (nameFilter) {
        const nameMatch = item.name.toLowerCase().includes(nameFilter);
        const altMatch = item.altnames?.some(alt => alt.toLowerCase().includes(nameFilter)) || false;
        if (!nameMatch && !altMatch) return false;
      }

      if (coinerFilter && !item.coiner.toLowerCase().includes(coinerFilter)) return false;

      if (tagsFilter.length) {
        const itemTags = item.tags?.map(t => t.toLowerCase()) || [];
        const hasAllTags = tagsFilter.every(tag => itemTags.some(t => t.includes(tag)));
        if (!hasAllTags) return false;
      }

      if (descFilter && !item.description.toLowerCase().includes(descFilter)) return false;

      return true;
    });

    const results = query
      ? filtered
          .map(item => ({ item, score: scoreEntry(item, query) }))
          .sort((a, b) => b.score - a.score)
          .map(entry => entry.item)
      : filtered;

    display(results);
  };

  ['search', 'filter-name', 'filter-coiner', 'filter-tags', 'filter-description'].forEach(id => {
    document.getElementById(id).addEventListener('input', runSearch);
  });

  runSearch();
});
