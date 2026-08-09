# Search Resources and Profile context separately

People Search embeds each Resource independently and keeps a separate per-Member embedding for
Passions and Heart Project rather than combining all Profile text into one vector. Every query
searches both indexes and merges evidence by Member, allowing the answer to distinguish an explicit
free or paid offer from interest in the same topic; help-seeking queries rank Resource evidence
first, while explicit free or paid wording filters strictly to that Resource classification. This
adds a second retrieval path and more vectors, but prevents Profile context from diluting precise
need-to-offer matching and allows one Resource edit to re-embed only that Resource.

Cost intent remains conversational rather than becoming a search control. A lightweight structured
classification step maps natural Romanian phrasing to `any`, `free`, or `paid` before retrieval, so
explicit cost intent can be enforced as a database filter instead of being left to answer generation.
