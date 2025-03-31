const pokeballBtn = document.getElementById('open-pokeball');
const pokemonResult = document.getElementById('pokemon-result');
const pokedexList = document.getElementById('pokedex-list');
const pokedexCount = document.getElementById('pokedex-count');
const languageToggle = document.getElementById('language-toggle');
const languageLabel = document.getElementById('language-label');
const sortSelect = document.getElementById('sort-select');
const searchInput = document.getElementById('search-input');
const lastOpenKey = 'lastOpenTimestamp';
const pokedexKey = 'myPokedex';

const typeIcons = {
  normal: "images/type/normal.png",
  fire: "images/type/fire.png",
  water: "images/type/water.png",
  electric: "images/type/electric.png",
  grass: "images/type/grass.png",
  ice: "images/type/ice.png",
  fighting: "images/type/fighting.png",
  poison: "images/type/poison.png",
  ground: "images/type/ground.png",
  flying: "images/type/flying.png",
  psychic: "images/type/psychic.png",
  bug: "images/type/bug.png",
  rock: "images/type/rock.png",
  ghost: "images/type/ghost.png",
  dragon: "images/type/dragon.png",
  dark: "images/type/dark.png",
  steel: "images/type/steel.png",
  fairy: "images/type/fairy.png"
};

function getTypeIcons(types) {
    return types.split(", ").map(type =>
        `<img src="${typeIcons[type]}" alt="${type}" class="type-icon">`
    ).join(" ");
}

async function fetchPokemonById(pokemonId) {
    const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokemonId}`);
    if (!res.ok) throw new Error('Erreur API Pokémon');
    const pokemon = await res.json();
    const speciesRes = await fetch(pokemon.species.url);
    const speciesData = await speciesRes.json();

    const selectedLanguage = localStorage.getItem('selectedLanguage') === "en" ? "en" : "fr";
    const pokemonName = speciesData.names.find(n => n.language.name === selectedLanguage)?.name || speciesData.name;

    return {
        id: pokemon.id,
        name: pokemonName,
        img: pokemon.sprites.front_default,
        shinyImg: pokemon.sprites.front_shiny,
        rarity: speciesData.is_legendary || speciesData.is_mythical ? "legendary" :
                speciesData.capture_rate <= 45 ? "rare" : "common",
        type: pokemon.types.map(t => t.type.name).join(", "),
        description: speciesData.flavor_text_entries.find(f => f.language.name === selectedLanguage)?.flavor_text || "Pas de description."
    };
}

async function fetchAnecdote(pokemonName) {
  try {
      const res = await fetch("http://localhost:3001/anecdote", {
          method: "POST",
          headers: {
              "Content-Type": "application/json"
          },
          body: JSON.stringify({ pokemonName })
      });

      const data = await res.json();
      return data.anecdote;
  } catch (err) {
      console.error("Erreur lors de la récupération de l’anecdote :", err);
      return "Anecdote indisponible pour le moment.";
  }
}

async function displayPokemonPopup(pokemon) {
  document.getElementById("popup-pokemon-name").textContent = pokemon.name;

  let existingRarity = document.getElementById("popup-pokemon-rarity");
  if (existingRarity) {
      existingRarity.remove();
  }

  let rarityContainer = document.createElement("div");
  rarityContainer.id = "popup-pokemon-rarity";
  rarityContainer.classList.add("rarity-container");

  if (pokemon.rarity === "common") {
      rarityContainer.classList.add("rarity-common");
      rarityContainer.textContent = "Commun";
  } else if (pokemon.rarity === "rare") {
      rarityContainer.classList.add("rarity-rare");
      rarityContainer.textContent = "Rare";
  } else if (pokemon.rarity === "legendary") {
      rarityContainer.classList.add("rarity-legendary");
      rarityContainer.textContent = "Légendaire";
  }

  const popupName = document.getElementById("popup-pokemon-name");
  popupName.insertAdjacentElement("afterend", rarityContainer);
  document.getElementById("popup-pokemon-img").src = pokemon.img;
  document.getElementById("popup-pokemon-type").innerHTML = `
      <div class="type-container">
          <span class="type-label">Type :</span>
          <div class="type-icon-container">
              ${getTypeIcons(pokemon.type)}
          </div>
      </div>
  `;

  const descriptionEl = document.getElementById("popup-pokemon-description");
  descriptionEl.textContent = pokemon.description;

  // Anecdote IA via Ollama
  fetchAnecdote(pokemon.name).then(anecdote => {
      const anecdoteEl = document.createElement("p");
      anecdoteEl.textContent = "📌 Anecdote : " + anecdote;
      anecdoteEl.style.marginTop = "10px";
      anecdoteEl.style.fontStyle = "italic";
      anecdoteEl.style.color = "white";
      anecdoteEl.style.textAlign = "justify";
      anecdoteEl.style.maxWidth = "90%";
      anecdoteEl.style.fontSize = "14px";
      descriptionEl.insertAdjacentElement("afterend", anecdoteEl);
  });

  document.getElementById("pokemon-popup").style.display = "block";
  document.querySelector(".close-btn").onclick = () => {
      document.getElementById("pokemon-popup").style.display = "none";
  };
}

async function displayPokedex() {
    chrome.storage.local.get([pokedexKey], async (result) => {
        let pokedex = result[pokedexKey] || [];
        const selectedLanguage = localStorage.getItem('selectedLanguage') === "en" ? "en" : "fr";
        const searchTerm = searchInput?.value?.toLowerCase() || "";
        const filteredPokedex = pokedex.filter(p => p.name.toLowerCase().includes(searchTerm));

        for (let i = 0; i < pokedex.length; i++) {
            const speciesRes = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${pokedex[i].id}/`);
            const speciesData = await speciesRes.json();
            pokedex[i].name = speciesData.names.find(n => n.language.name === selectedLanguage)?.name || speciesData.name;
        }

        const sortOption = sortSelect?.value || "capture";
        const sortedPokedex = [...filteredPokedex];
        
        if (sortOption === "pokedex") {
            sortedPokedex.sort((a, b) => a.id - b.id);
        } else {
            sortedPokedex.sort((a, b) => a.capturedAt - b.capturedAt);
        }        

        pokedexList.innerHTML = sortedPokedex.map(p => `
            <li class="pokemon-container ${p.rarity}" data-id="${p.id}">
              <img src="${p.img}" alt="${p.name}" class="pokedex-img">
              <span class="pokemon-name">${p.name}</span>
              ${p.isNew ? '<span class="new-pokemon">NEW</span>' : ''}
              ${p.isShiny ? '<span class="shiny-star">✨</span>' : ''}
            </li>`).join('');
        
        document.querySelectorAll(".pokemon-container").forEach(pokemonElement => {
            pokemonElement.addEventListener("click", async (event) => {
                const pokemonId = event.currentTarget.dataset.id;
                const pokemonData = await fetchPokemonById(pokemonId);
                displayPokemonPopup(pokemonData);
            });
        });

        document.querySelectorAll(".pokemon-container").forEach(pokemonElement => {
            pokemonElement.addEventListener("mouseover", async (event) => {
                const pokemonId = event.currentTarget.dataset.id;
                chrome.storage.local.get([pokedexKey], (result) => {
                    let pokedex = result[pokedexKey] || [];
                    let updated = false;
        
                    pokedex = pokedex.map(p => {
                        if (p.id === parseInt(pokemonId) && p.isNew) {
                            p.isNew = false;
                            updated = true;
                        }
                        return p;
                    });
        
                    if (updated) {
                        chrome.storage.local.set({ [pokedexKey]: pokedex }, () => {
                            displayPokedex();
                        });
                    }
                });
            });
        
            pokemonElement.addEventListener("click", async (event) => {
                const pokemonId = event.currentTarget.dataset.id;
                const pokemonData = await fetchPokemonById(pokemonId);
                displayPokemonPopup(pokemonData);
            });
        });        

        pokedexCount.textContent = `${filteredPokedex.length} Pokémon capturés`;
    });
}

sortSelect?.addEventListener('change', displayPokedex);

pokeballBtn?.addEventListener('click', async () => {
    const now = Date.now();
    const result = await chrome.storage.local.get([lastOpenKey]);
    const lastOpen = result[lastOpenKey] || 0;
  
    if (now - lastOpen >= 1000) {
      try {
        const pokemonId = Math.floor(Math.random() * 1025) + 1;
        const isShiny = Math.random() < 0.02; // Changer taux shiny 
        const pokemon = await fetchPokemonById(pokemonId);
        pokemon.isShiny = isShiny;
  
        let isNew = false;
        let updatedSprite = false;
  
        chrome.storage.local.get([pokedexKey], (result) => {
          let pokedex = result[pokedexKey] || [];
          const index = pokedex.findIndex(p => p.id === pokemon.id);
  
          if (index === -1) {
            isNew = true;
            pokedex.push({
              id: pokemon.id,
              name: pokemon.name,
              img: pokemon.isShiny ? pokemon.shinyImg : pokemon.img,
              rarity: pokemon.rarity,
              isShiny: pokemon.isShiny,
              capturedAt: Date.now(),
              isNew: true
            });
          } else {
            const existing = pokedex[index];
            if (!existing.isShiny && pokemon.isShiny) {
              pokedex[index] = {
                ...existing,
                img: pokemon.shinyImg,
                isShiny: true,
                isNew: true
              };
              updatedSprite = true;
            }
          }
  
          pokemonResult.innerHTML = `
            <div class="pokemon-result-container ${pokemon.rarity}">
                <img src="${pokemon.isShiny ? pokemon.shinyImg : pokemon.img}" class="${pokemon.isShiny ? 'shiny-effect' : ''}">
                ${pokemon.isShiny ? '<span class="shiny-indicator">✨</span>' : ''}
                ${(isNew || updatedSprite) ? '<span class="new-pokemon">NEW</span>' : ''}
            </div>
            <div class="pokemon-result-name">
                ${pokemon.name}
            </div>
            `;

          chrome.storage.local.set({ [pokedexKey]: pokedex }, () => {
            displayPokedex();
          });
  
          if (isNew || updatedSprite) {
            setTimeout(() => {
              pokedex = pokedex.map(p =>
                p.id === pokemon.id ? { ...p, isNew: false } : p
              );
              chrome.storage.local.set({ [pokedexKey]: pokedex });
              displayPokedex();
            }, 5000);
          }
        });
  
        chrome.storage.local.set({ [lastOpenKey]: now });
      } catch (error) {
        pokemonResult.innerHTML = `<p>Erreur de chargement : ${error.message}</p>`;
      }
    }
  });

languageToggle?.addEventListener('change', () => {
    const newLanguage = languageToggle.checked ? 'en' : 'fr';
    localStorage.setItem('selectedLanguage', newLanguage);
    languageLabel.textContent = newLanguage === "en" ? "English" : "Français";
    displayPokedex();
});

document.addEventListener('DOMContentLoaded', () => {
    searchInput?.addEventListener("input", displayPokedex);
    languageLabel.textContent = localStorage.getItem('selectedLanguage') === "en" ? "English" : "Français";
    displayPokedex();
});